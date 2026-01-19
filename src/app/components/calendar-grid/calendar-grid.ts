import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, finalize, map, of } from 'rxjs';

import { ReservationBlock } from '../../core/models/reservation-block';
import { RoomDto } from '../../core/models/room.dto';
import { CalendarApiService } from '../../core/services/calendar-api';
import { RoomApiService } from '../../core/services/room-api';
import { toReservationBlock } from '../../core/mappers/calendar.mapper';
import { MatDialog } from '@angular/material/dialog';
import { ReserveRoomsDialogComponent } from '../../pages/calendar/reserve-rooms-dialog/reserve-rooms-dialog';

@Component({
  standalone: true,
  selector: 'app-calendar-grid',
  imports: [CommonModule],
  templateUrl: './calendar-grid.html',
  styleUrls: ['./calendar-grid.scss'],
})
export class CalendarGrid implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('headerRooms', { static: true }) headerRooms!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyScroll', { static: true }) bodyScroll!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) selectedDate!: string;
  @Input() showOnlyMine = false;
  @Input() myEmployeeId!: number;

  isLoading = false;
  isLoadingRooms = false;
  errorMsg: string | null = null;

  isSelecting = false;
  selectionRoomId: number | null = null;
  selectionAnchorSlot = 0;

  selectionStartSlot = 0;
  selectionEndSlot = 0;

  rooms: RoomDto[] = [];
  allReservations: ReservationBlock[] = [];

  startHour = 8;
  endHour = 22;
  slotMinutes = 15;
  slotPx = 28;

  private pendingStableCheck = false;

  constructor(
    private calendarApi: CalendarApiService,
    private roomApi: RoomApiService,
    private zone: NgZone,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRooms();
    this.loadDay(this.selectedDate);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']?.currentValue && !changes['selectedDate']?.firstChange) {
      this.loadDay(this.selectedDate);
    }
  }

  ngAfterViewInit(): void {
    this.runAfterRender(() => this.updateHorizontalScrollClass());
  }

  private runAfterRender(fn: () => void) {
    if (this.pendingStableCheck) return;
    this.pendingStableCheck = true;

    const sub = this.zone.onStable.subscribe(() => {
      sub.unsubscribe();
      this.pendingStableCheck = false;

      fn();
      requestAnimationFrame(fn);
    });
  }

  get totalSlots(): number {
    return this.times.length;
  }

  private clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(n, max));
  }

  private yToSlotIndex(y: number): number {
    const raw = Math.floor(y / this.slotPx);
    return this.clamp(raw, 0, this.totalSlots - 1);
  }

  private slotToHHmm(slot: number): string {
    const totalMin = slot * this.slotMinutes;
    const h = this.startHour + Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private buildLocalDateTime(date: string, hhmm: string): string {
    return `${date}T${hhmm}:00`;
  }

  onGridMouseDown(ev: MouseEvent, roomId: number) {
    if (ev.button !== 0) {
      return;
    } // clicks: 0=left, 1=middle, 2=right

    // Ignore selection when clicking on an existing reservation block
    const target = ev.target as HTMLElement;
    if (target.closest('.block')) {
      return;
    }

    ev.preventDefault();

    const col = ev.currentTarget as HTMLElement;
    const rect = col.getBoundingClientRect();
    const y = ev.clientY - rect.top;

    const slot = this.yToSlotIndex(y);

    this.isSelecting = true;
    this.selectionRoomId = roomId;
    this.selectionAnchorSlot = slot;
    this.selectionStartSlot = slot;
    this.selectionEndSlot = slot + 1; // end exclusive (minimum 1 slot)

    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  private blockToSlotRange(r: ReservationBlock): { start: number; end: number } {
    const startMin = this.minutesFromGridStart(r.startTime);
    const endMin = this.minutesFromGridStart(r.endTime);

    const start = Math.floor(startMin / this.slotMinutes);
    const end = Math.ceil(endMin / this.slotMinutes); // exclusive

    return {
      start: this.clamp(start, 0, this.totalSlots),
      end: this.clamp(end, 0, this.totalSlots),
    };
  }

  private clampSelectionToFreeSpace(
    roomId: number,
    anchor: number,
    cursor: number
  ): { start: number; end: number } {
    const blocks = this.reservationsForRoom(roomId)
      .map((r) => this.blockToSlotRange(r))
      .filter((b) => b.end > b.start);

    const goingDown = cursor >= anchor;

    if (goingDown) {
      let end = Math.min(this.totalSlots, cursor + 1);

      const cut = blocks
        .filter((b) => b.start < end && b.end > anchor)
        .map((b) => b.start)
        .reduce((min, v) => Math.min(min, v), Infinity);

      if (cut !== Infinity) {
        end = Math.max(anchor + 1, cut);
      }

      return { start: anchor, end };
    } else {
      const end = Math.min(this.totalSlots, anchor + 1);
      let start = Math.max(0, cursor);

      const cut = blocks
        .filter((b) => b.start < end && b.end > start)
        .map((b) => b.end)
        .reduce((max, v) => Math.max(max, v), -Infinity);

      if (cut !== -Infinity) {
        start = Math.min(anchor, cut);
      }

      if (end - start < 1) start = end - 1;

      return { start, end };
    }
  }

  private onWindowMouseMove = (ev: MouseEvent) => {
    if (!this.isSelecting || this.selectionRoomId == null) return;

    const activeCol = document.querySelector(
      `.roomCol[data-room-id="${this.selectionRoomId}"]`
    ) as HTMLElement | null;
    if (!activeCol) return;

    const rect = activeCol.getBoundingClientRect();
    const y = ev.clientY - rect.top;

    const slot = this.yToSlotIndex(y);

    const roomId = this.selectionRoomId;
    const anchor = this.selectionAnchorSlot;
    const { start, end } = this.clampSelectionToFreeSpace(roomId, anchor, slot);

    this.selectionStartSlot = start;
    this.selectionEndSlot = end; // end is exclusive
  };

  private onWindowMouseUp = (_ev: MouseEvent) => {
    if (!this.isSelecting) return;

    this.isSelecting = false;

    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);

    const date = this.selectedDate;
    const startHHmm = this.slotToHHmm(this.selectionStartSlot);
    const endHHmm = this.slotToHHmm(this.selectionEndSlot);

    const startLdt = this.buildLocalDateTime(date, startHHmm);
    const endLdt = this.buildLocalDateTime(date, endHHmm);

    this.dialog
      .open(ReserveRoomsDialogComponent, {
        width: '720px',
        maxWidth: '92vw',
        panelClass: 'reserveRoomsDialogPanel',
        autoFocus: false,
        data: {
          startTime: startLdt,
          endTime: endLdt,
          initialRoomId: this.selectionRoomId ?? undefined,
        },
      })
      .afterClosed()
      .subscribe((res: { saved: any }) => {
        if (res?.saved) {
          this.loadDay(this.selectedDate);
        }
      });

    this.selectionRoomId = null;
  };

  selectionStyle(): { [k: string]: string } {
    const inset = 3;
    const top = this.selectionStartSlot * this.slotPx + inset;
    const height =
      (this.selectionEndSlot - this.selectionStartSlot) * this.slotPx - inset * 2;

    return {
      top: `${top}px`,
      height: `${Math.max(this.slotPx - 6, height)}px`,
    };
  }

  get slotsCss(): string {
    return '' + this.times.length;
  }

  get times(): string[] {
    const totalSlots = ((this.endHour - this.startHour) * 60) / this.slotMinutes;
    return Array.from({ length: totalSlots }, (_, i) => {
      const total = i * this.slotMinutes;
      const h = this.startHour + Math.floor(total / 60);
      const m = total % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    });
  }

  loadRooms() {
    this.isLoadingRooms = true;

    this.roomApi
      .getAllRooms()
      .pipe(finalize(() => (this.isLoadingRooms = false)))
      .subscribe((rooms) => {
        this.rooms = rooms;
        this.runAfterRender(() => this.updateHorizontalScrollClass());
      });
  }

  loadDay(date: string) {
    this.isLoading = true;
    this.errorMsg = null;

    this.calendarApi
      .getDayEntries(date)
      .pipe(
        map((entries) => entries.map((e) => toReservationBlock(e))),
        finalize(() => (this.isLoading = false)),
        catchError(() => {
          this.errorMsg = 'Ne mogu da učitam rezervacije.';
          this.allReservations = [];
          return of([] as ReservationBlock[]);
        })
      )
      .subscribe((blocks) => {
        this.allReservations = blocks;
        this.runAfterRender(() => this.updateHorizontalScrollClass());
      });
  }

  onBodyScroll() {
    this.headerRooms.nativeElement.scrollLeft = this.bodyScroll.nativeElement.scrollLeft;
  }

  private updateHorizontalScrollClass() {
    const body = this.bodyScroll?.nativeElement;
    if (!body) return;

    const hasXScroll = body.scrollWidth - body.clientWidth > 2;

    body.classList.toggle('has-x-scroll', hasXScroll);

    const wrap = body.closest('.calWrap');
    if (wrap) wrap.classList.toggle('has-x-scroll', hasXScroll);
  }

  get visibleReservations(): ReservationBlock[] {
    if (!this.showOnlyMine) return this.allReservations;
    return this.allReservations.filter((r) => r.employeeId === this.myEmployeeId);
  }

  reservationsForRoom(roomId: number) {
    return this.visibleReservations.filter((r) => r.roomId === roomId);
  }

  colorClass(r: ReservationBlock) {
    return `c-${r.status.toLowerCase()}-${r.reservationType.toLowerCase()}`;
  }

  statusClass(r: ReservationBlock) {
    return `s-${r.status.toLowerCase()}`;
  }

  blockStyle(r: ReservationBlock): { [k: string]: string } {
    const startMin = this.minutesFromGridStart(r.startTime);
    const endMin = this.minutesFromGridStart(r.endTime);

    const startSlots = Math.round(startMin / this.slotMinutes);
    const durationSlots = Math.max(
      1,
      Math.round((endMin - startMin) / this.slotMinutes)
    );

    const top = startSlots * this.slotPx;

    const inset = 3;
    const height = durationSlots * this.slotPx - inset * 2;

    return {
      top: `${top + inset}px`,
      height: `${Math.max(this.slotPx - 6, height)}px`,
    };
  }

  private minutesFromGridStart(iso: string): number {
    const d = new Date(iso);
    const day = iso.substring(0, 10);
    const gridStart = new Date(
      `${day}T${String(this.startHour).padStart(2, '0')}:00:00`
    );

    let diff = Math.floor((d.getTime() - gridStart.getTime()) / 60000);
    const max = (this.endHour - this.startHour) * 60;
    diff = Math.max(0, Math.min(diff, max));
    return diff;
  }

  hhmm(iso: string) {
    return iso.substring(11, 16);
  }

  isCompact(r: ReservationBlock): boolean {
    const startMin = this.minutesFromGridStart(r.startTime);
    const endMin = this.minutesFromGridStart(r.endTime);
    const durationMin = Math.max(0, endMin - startMin);
    return durationMin <= 30;
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {catchError, finalize, map, of} from 'rxjs';

import {ReservationBlock} from '../../../../core/models/reservation-block';
import {RoomResponse} from '../../../../core/responses/room.response';
import {CalendarApiService} from '../../../../core/services/calendar-api';
import {RoomApiService} from '../../../../core/services/room-api';
import {toReservationBlock, toReservationBlocksFromCreate} from '../../../../core/mappers/calendar.mapper';
import {MatDialog} from '@angular/material/dialog';
import {ReserveRoomsDialogComponent} from '../../dialogs/reserve-rooms-dialog/reserve-rooms-dialog';
import {ReservationApiService} from '../../../../core/services/reservation-api';
import {ReservationCreatedResponse} from '../../../../core/responses/reservation-created.response';
import {
  AdminReviewReservationDialog
} from '../../dialogs/admin-review-reservation-dialog/admin-review-reservation-dialog';
import {ApiErrorMapper} from '../../../../core/utils/api-error';
import {I18nService} from '../../../../core/i18n/I18n.service';
import {TPipe} from '../../../../core/i18n/t.pipe';

@Component({
  standalone: true,
  selector: 'app-calendar-grid',
  imports: [CommonModule, TPipe],
  templateUrl: './calendar-grid.html',
  styleUrls: ['./calendar-grid.scss'],
})
export class CalendarGrid implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('headerRooms', {static: true}) headerRooms!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyScroll', {static: true}) bodyScroll!: ElementRef<HTMLDivElement>;

  @Input({required: true}) selectedDate!: string;
  @Input() showOnlyMine = false;
  @Input() myEmployeeId!: number;
  @Input() isAdmin = false;

  isLoadingRooms = false;
  isLoadingDay = false;

  roomsError: string | null = null;
  dayError: string | null = null;

  isCheckingAvailability = false; // before opening modal

  isSelecting = false;
  selectionRoomId: number | null = null;
  selectionAnchorSlot = 0;

  selectionStartSlot = 0;
  selectionEndSlot = 0;

  rooms: RoomResponse[] = [];
  allReservations: ReservationBlock[] = [];

  startHour = 8;
  endHour = 22;
  slotMinutes = 15;
  slotPx = 28;

  private headerEl: HTMLElement | null = null;
  private pendingStableCheck = false;

  constructor(
    private calendarApi: CalendarApiService,
    private roomApi: RoomApiService,
    private reservationApi: ReservationApiService,
    private zone: NgZone,
    private dialog: MatDialog,
    private i18n: I18nService
  ) {
  }

  get pastSlotsCss(): string {
    // Past day: everything is disabled
    if (this.isPastDaySelected()) return String(this.totalSlots);

    // Future day: nothing is disabled
    if (!this.isTodaySelected()) return '0';

    // Today: calculate how many slots have already started
    const now = new Date();
    const isoDate = this.selectedIso();
    const gridStart = new Date(`${isoDate}T${String(this.startHour).padStart(2, '0')}:00:00`);

    const diffMin = Math.floor((now.getTime() - gridStart.getTime()) / 60000);

    // Number of slots that have already started, including the currently running one
    const slots = Math.floor(diffMin / this.slotMinutes) + 1;

    return String(this.clamp(slots, 0, this.totalSlots));
  }

  get totalSlots(): number {
    return this.times.length;
  }

  get slotsCss(): string {
    return '' + this.times.length;
  }

  get times(): string[] {
    const totalSlots = ((this.endHour - this.startHour) * 60) / this.slotMinutes;
    return Array.from({length: totalSlots}, (_, i) => {
      const total = i * this.slotMinutes;
      const h = this.startHour + Math.floor(total / 60);
      const m = total % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    });
  }

  get isInitialLoading(): boolean {
    return this.isLoadingRooms || this.isLoadingDay;
  }

  get canRenderGrid(): boolean {
    return !this.isInitialLoading && !this.roomsError && !this.dayError && (this.rooms?.length ?? 0) > 0;
  }

  // ===================== DATE HELPERS =====================

  get visibleReservations(): ReservationBlock[] {
    const base = this.allReservations.filter(r => this.isRenderable(r));

    if (!this.showOnlyMine) {
      return base;
    }

    return base.filter((r) => r.employeeId === this.myEmployeeId);
  }

  ngOnInit(): void {
    this.loadRooms();
    this.loadDay(this.selectedDate);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']?.currentValue && !changes['selectedDate']?.firstChange) {
      // avoid “stuck selection” when changing date
      this.resetSelection();
      this.loadDay(this.selectedDate);
    }
  }

  // ===================== PAST OVERLAY =====================

  ngAfterViewInit(): void {
    this.runAfterRender(() => this.updateHorizontalScrollClass());
  }

  ngOnDestroy(): void {
    this.resetSelection();
  }

  isTodaySelected(): boolean {
    const today = new Date();
    const iso = this.selectedIso();
    const d = new Date(`${iso}T00:00:00`);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }

  isPastDaySelected(): boolean {
    const iso = this.selectedIso();
    const d = new Date(`${iso}T00:00:00`);

    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // today at 00:00

    return d.getTime() < t0.getTime();
  }

  isPastSlotIndex(slotIndex: number): boolean {
    // Entire day is in the past
    if (this.isPastDaySelected()) return true;

    // Future day (not today): no past slots
    if (!this.isTodaySelected()) return false;

    // Today: slot is past if its start time is <= now
    const hhmm = this.slotToHHmm(slotIndex);
    const iso = this.buildLocalDateTime(this.selectedIso(), hhmm);
    return new Date(iso).getTime() <= Date.now();
  }

  onGridMouseDown(ev: MouseEvent, roomId: number) {
    if (ev.button !== 0) {
      return;
    }

    const target = ev.target as HTMLElement;
    if (target.closest('.block')) {
      return;
    }

    ev.preventDefault();

    // Do not allow selection on a past day
    if (this.isPastDaySelected()) {
      return;
    }

    const col = ev.currentTarget as HTMLElement;
    const rect = col.getBoundingClientRect();
    const y = ev.clientY - rect.top;

    const slot = this.yToSlotIndex(y);

    // Do not allow starting selection in the past (for today)
    if (this.isPastSlotIndex(slot)) {
      return;
    }

    this.isSelecting = true;
    this.selectionRoomId = roomId;
    this.selectionAnchorSlot = slot;
    this.selectionStartSlot = slot;
    this.selectionEndSlot = slot + 1;

    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  selectionStyle(): { [k: string]: string } {
    const inset = 3;
    const top = this.selectionStartSlot * this.slotPx + inset;
    const height = (this.selectionEndSlot - this.selectionStartSlot) * this.slotPx - inset * 2;

    return {
      top: `${top}px`,
      height: `${Math.max(this.slotPx - 6, height)}px`,
    };
  }

  loadRooms() {
    this.isLoadingRooms = true;
    this.roomsError = null;

    this.roomApi
      .getAllRooms().pipe(
      catchError(() => {
        this.roomsError = 'Unable to load rooms.';
        this.rooms = [];
        return of([] as RoomResponse[]);
      }),
      finalize(() => this.isLoadingRooms = false))
      .subscribe((rooms) => {
        this.rooms = rooms;
        this.runAfterRender(() => this.updateHorizontalScrollClass());
      });
  }

  loadDay(date: string) {
    this.dayError = null;
    this.isLoadingDay = true;

    this.calendarApi
      .getDayEntries(date)
      .pipe(
        map((entries) => entries.map((e) => toReservationBlock(e))),
        catchError((e) => {
          this.dayError = ApiErrorMapper.toMessage(e, (k) => this.i18n.t(k));
          this.allReservations = [];
          return of([] as ReservationBlock[]);
        }),
        finalize(() => this.isLoadingDay = false)
      )
      .subscribe((blocks) => {
        this.allReservations = blocks;
        this.runAfterRender(() => this.updateHorizontalScrollClass());
      });
  }

  onBodyScroll(e: Event) {
    const bodyEl = e.target as HTMLElement;

    // cache header element once
    if (!this.headerEl) {
      this.headerEl = bodyEl.closest('.cal')?.querySelector('.cal__headerRooms') as HTMLElement | null;
    }

    if (!this.headerEl) {
      return;
    }

    this.headerEl.scrollLeft = bodyEl.scrollLeft;
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
    const durationSlots = Math.max(1, Math.round((endMin - startMin) / this.slotMinutes));

    const top = startSlots * this.slotPx;

    const inset = 3;
    const height = durationSlots * this.slotPx - inset * 2;

    return {
      top: `${top + inset}px`,
      height: `${Math.max(this.slotPx - 6, height)}px`,
    };
  }

  hhmm(iso: string) {
    return iso.substring(11, 16);
  }

  isCompact(r: ReservationBlock): boolean {
    const startMin = this.minutesFromGridStart(r.startTime);
    const endMin = this.minutesFromGridStart(r.endTime);
    const durationMin = Math.max(0, endMin - startMin);
    return durationMin <= 15;
  }

  canAdminReview(r: ReservationBlock): boolean {
    if (!this.isAdmin) {
      return false;
    }
    if (r.status !== 'PENDING') {
      return false;
    }

    const startMs = new Date(r.startTime).getTime();
    return startMs > Date.now();
  }

  onReservationClick(r: ReservationBlock, ev: MouseEvent) {
    ev.stopPropagation();
    if (!this.canAdminReview(r)) {
      return;
    }

    this.openAdminReviewDialog(r);
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

  // cleanup selection + global listeners
  private resetSelection() {
    this.isSelecting = false;
    this.selectionRoomId = null;
    this.selectionAnchorSlot = 0;
    this.selectionStartSlot = 0;
    this.selectionEndSlot = 0;

    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
  }

  private selectedIso(): string {
    return this.selectedDate;
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

  private clampSelectionToFreeSpace(roomId: number, anchor: number, cursor: number): { start: number; end: number } {
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

      if (cut !== Infinity) end = Math.max(anchor + 1, cut);

      return {start: anchor, end};
    } else {
      const end = Math.min(this.totalSlots, anchor + 1);
      let start = Math.max(0, cursor);

      const cut = blocks
        .filter((b) => b.start < end && b.end > start)
        .map((b) => b.end)
        .reduce((max, v) => Math.max(max, v), -Infinity);

      if (cut !== -Infinity) start = Math.min(anchor, cut);

      if (end - start < 1) start = end - 1;

      return {start, end};
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

    // While dragging, do not allow entering past slots (for today)
    if (this.isPastSlotIndex(slot)) {
      const safeSlot = Math.max(anchor, Number(this.pastSlotsCss));
      const {start, end} = this.clampSelectionToFreeSpace(roomId, anchor, safeSlot);
      this.selectionStartSlot = start;
      this.selectionEndSlot = end;
      return;
    }

    const {start, end} = this.clampSelectionToFreeSpace(roomId, anchor, slot);

    this.selectionStartSlot = start;
    this.selectionEndSlot = end;
  };

  // open modal after api call
  private onWindowMouseUp = (_ev: MouseEvent) => {
    if (!this.isSelecting) {
      return;
    }

    // capture selection before cleanup
    const roomId = this.selectionRoomId;
    const startSlot = this.selectionStartSlot;
    const endSlot = this.selectionEndSlot;

    // cleanup selection immediately (prevents “stuck” highlight)
    this.resetSelection();

    const date = this.selectedIso();
    const startHHmm = this.slotToHHmm(startSlot);
    const endHHmm = this.slotToHHmm(endSlot);

    const startLdt = this.buildLocalDateTime(date, startHHmm);
    const endLdt = this.buildLocalDateTime(date, endHHmm);

    // wait for availability call, then open dialog
    this.isCheckingAvailability = true;

    this.reservationApi
      .busyRoomIds(startLdt, endLdt)
      .pipe(finalize(() => (this.isCheckingAvailability = false)))
      .subscribe({
        next: (busyIds) => {
          const busy = new Set<number>(busyIds);
          const availableRooms = (this.rooms ?? []).filter((r) => !busy.has(r.id));

          this.dialog
            .open(ReserveRoomsDialogComponent, {
              width: '720px',
              maxWidth: '92vw',
              panelClass: 'reserveRoomsDialogPanel',
              autoFocus: false,
              data: {
                startTime: startLdt,
                endTime: endLdt,
                initialRoomId: roomId ?? undefined,

                // pass already computed list so modal doesn't need to load
                availableRooms,
                availabilityFailed: false,

                // keep this for backward compatibility if you still use it
                roomsSnapshot: this.rooms,
                isAdmin: this.isAdmin
              },
            })
            .afterClosed()
            .subscribe((res: { saved: boolean; created?: ReservationCreatedResponse } | undefined) => {
              if (res?.saved && res.created) {
                this.addCreatedReservationToGrid(res.created);
              }
            });
        },
        error: () => {
          // if availability service is down, you can still open modal in “unavailable” state
          this.dialog
            .open(ReserveRoomsDialogComponent, {
              width: '720px',
              maxWidth: '92vw',
              panelClass: 'reserveRoomsDialogPanel',
              autoFocus: false,
              data: {
                startTime: startLdt,
                endTime: endLdt,
                initialRoomId: roomId ?? undefined,

                availableRooms: [],
                availabilityFailed: true,

                roomsSnapshot: this.rooms,
                isAdmin: this.isAdmin
              },
            })
            .afterClosed()
            .subscribe((res: { saved: any }) => {
              if (res?.saved) this.loadDay(this.selectedDate);
            });
        },
      });
  };

  private updateHorizontalScrollClass() {
    const body = this.bodyScroll?.nativeElement;
    if (!body) return;

    const hasXScroll = body.scrollWidth - body.clientWidth > 2;

    body.classList.toggle('has-x-scroll', hasXScroll);

    const wrap = body.closest('.calWrap');
    if (wrap) wrap.classList.toggle('has-x-scroll', hasXScroll);
  }

  private isRenderable(r: ReservationBlock): boolean {
    return r.status !== 'DECLINED';
  }

  private minutesFromGridStart(iso: string): number {
    const d = new Date(iso);
    const day = iso.substring(0, 10);
    const gridStart = new Date(`${day}T${String(this.startHour).padStart(2, '0')}:00:00`);

    let diff = Math.floor((d.getTime() - gridStart.getTime()) / 60000);
    const max = (this.endHour - this.startHour) * 60;
    diff = Math.max(0, Math.min(diff, max));
    return diff;
  }

  private openAdminReviewDialog(r: ReservationBlock) {
    const rooms = this.roomsForReservationId(r.reservationId);

    const ref = this.dialog.open(AdminReviewReservationDialog, {
      width: '520px',
      maxWidth: '92vw',
      autoFocus: false,
      data: {reservation: r, rooms},
    });

    ref.afterClosed().subscribe((res: { saved: boolean; approvedRoomIds?: number[]; declinedRoomIds?: number[] } | undefined) => {
      if (!res?.saved) return;

      const approved = new Set(res.approvedRoomIds ?? []);
      const declined = new Set(res.declinedRoomIds ?? []);

      this.allReservations = this.allReservations.map(b => {
        if (b.reservationId !== r.reservationId) return b;

        if (approved.has(b.roomId)) return { ...b, status: 'APPROVED' };
        if (declined.has(b.roomId)) return { ...b, status: 'DECLINED' };

        return b;
      });

      this.allReservations = this.allReservations.filter(b => b.status !== 'DECLINED');
    });
  }

  private addCreatedReservationToGrid(created: ReservationCreatedResponse) {
    const roomNameById = new Map(this.rooms.map(r => [r.id, r.name] as const));
    const newBlocks = toReservationBlocksFromCreate(created, roomNameById);

    this.allReservations = this.allReservations.filter(b => b.reservationId !== created.id);
    this.allReservations = [...newBlocks, ...this.allReservations];
  }

  private roomsForReservationId(reservationId: number): { roomId: number; roomName: string }[] {
    const items = this.allReservations
      .filter(b => b.reservationId === reservationId)
      .filter(b => b.status === 'PENDING')
      .map(b => ({ roomId: b.roomId, roomName: b.roomName }))
      .filter(x => !!x.roomName);

    // unique by roomId
    const map = new Map<number, {roomId:number; roomName:string}>();
    for (const it of items) {
      map.set(it.roomId, it);
    }
    return Array.from(map.values());
  }

}

import {Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {ReservationBlock} from '../../core/models/reservation-block';
import {RoomDto} from '../../core/models/room.dto';
import {CommonModule} from '@angular/common';
import {catchError, finalize, map, of} from 'rxjs';
import {CalendarApiService} from '../../core/services/calendar-api';
import {RoomApiService} from '../../core/services/room-api';
import {toReservationBlock} from '../../core/mappers/calendar.mapper';

@Component({
  standalone: true,
  selector: 'app-calendar-grid',
  imports: [CommonModule],
  templateUrl: './calendar-grid.html',
  styleUrls: ['./calendar-grid.scss'],
})
export class CalendarGrid implements OnInit, OnChanges {
  @ViewChild('headerRooms', {static: true}) headerRooms!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyScroll', {static: true}) bodyScroll!: ElementRef<HTMLDivElement>

  @Input({required: true}) selectedDate!: string;
  @Input() showOnlyMine = false;
  @Input() myEmployeeId!: number;

  isLoading = false;
  errorMsg: string | null = null;
  allReservations: ReservationBlock[] = [];

  startHour = 8;
  endHour = 20;
  slotMinutes = 15;

  slotPx = 28;

  rooms: RoomDto[] = [];

  constructor(
    private calendarApi: CalendarApiService,
    private roomApi: RoomApiService) {
  }

  ngOnInit(): void {
    this.loadRooms();
    this.loadDay(this.selectedDate);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']?.currentValue && !changes['selectedDate']?.firstChange) {
      this.loadDay(this.selectedDate);
    }
  }

  loadRooms() {
    this.roomApi.getAllRooms().subscribe(rooms => {
      this.rooms = rooms;
    });
  }

  loadDay(date: string) {
    this.isLoading = true;
    this.errorMsg = null;

    this.calendarApi.getDayEntries(date).pipe(
      map(entries => entries.map(e => toReservationBlock(e))),
      finalize(() => this.isLoading = false),
      catchError(err => {
        this.errorMsg = 'Ne mogu da učitam rezervacije.';
        this.allReservations = [];
        return of([] as ReservationBlock[]);
      }),
    ).subscribe(blocks => {
      this.allReservations = blocks;
    });
  }

  times: string[] = Array.from({length: 48}, (_, i) => {
    const total = i * this.slotMinutes;
    const h = this.startHour + Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  onBodyScroll() {
    this.headerRooms.nativeElement.scrollLeft = this.bodyScroll.nativeElement.scrollLeft;
  }

  get visibleReservations(): ReservationBlock[] {
    if (!this.showOnlyMine) return this.allReservations;
    return this.allReservations.filter(r => r.employeeId === this.myEmployeeId);
  }

  reservationsForRoom(roomId: number) {
    return this.visibleReservations.filter(r => r.roomId === roomId);
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

  private minutesFromGridStart(iso: string): number {
    const d = new Date(iso);
    const day = iso.substring(0, 10);
    const gridStart = new Date(`${day}T${String(this.startHour).padStart(2, '0')}:00:00`);

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

    return durationMin <= 30; // <= 30 min = compact (promeni ako želiš)
  }

}

import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ReservationBlock} from '../../core/models/reservation-block';
import {CommonModule} from '@angular/common';
import {catchError, finalize, map, of} from 'rxjs';
import {CalendarApiService} from '../../core/services/calendar-api';
import {toReservationBlock} from '../../core/mappers/calendar.mapper';

@Component({
  standalone: true,
  selector: 'app-calendar-grid',
  imports: [CommonModule],
  templateUrl: './calendar-grid.html',
  styleUrl: './calendar-grid.scss',
})
export class CalendarGrid implements OnInit {
  @ViewChild('headerRooms', { static: true }) headerRooms!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyScroll', { static: true }) bodyScroll!: ElementRef<HTMLDivElement>

  selectedDate = '2025-12-29';
  isLoading = false;
  errorMsg: string | null = null;
  reservations: ReservationBlock[] = [];

  startHour = 8;
  endHour = 20;
  slotMinutes = 15;

  slotPx = 28;

  rooms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  constructor(private calendarApi: CalendarApiService) {}

  ngOnInit(): void {
    this.loadDay(this.selectedDate);
  }

  loadDay(date: string) {
    this.isLoading = true;
    this.errorMsg = null;

    this.calendarApi.getDayEntries(date).pipe(
      map(entries => entries.map(e => toReservationBlock(e))),
      finalize(() => this.isLoading = false),
      catchError(err => {
        this.errorMsg = 'Ne mogu da učitam rezervacije.';
        this.reservations = [];
        return of([] as ReservationBlock[]);
      }),
    ).subscribe(blocks => {
      this.reservations = blocks;
    });
  }

  times: string[] = Array.from({ length: 48 }, (_, i) => {
    const total = i * this.slotMinutes;
    const h = this.startHour + Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  onBodyScroll() {
    this.headerRooms.nativeElement.scrollLeft = this.bodyScroll.nativeElement.scrollLeft;
  }

  reservationsForRoom(roomId: number) {
    return this.reservations.filter(r => r.roomId === roomId);
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

}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {CalendarGrid} from '../../components/calendar-grid/calendar-grid';

@Component({
  standalone: true,
  selector: 'app-day-grid',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    CalendarGrid
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './day-grid.html',
  styleUrl: './day-grid.scss'
})
export class DayGrid {
  today = new Date();
  maxDate = new Date(this.today.getTime() + 30 * 24 * 60 * 60 * 1000);

  selectedDate = signal<Date>(this.today);

  prevDay() {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() - 1);
    if (d < this.today) return;
    this.selectedDate.set(d);
  }

  nextDay() {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() + 1);
    if (d > this.maxDate) return;
    this.selectedDate.set(d);
  }

  onDateChange(d: Date | null) {
    if (!d) return;
    if (d < this.today || d > this.maxDate) return;
    this.selectedDate.set(d);
  }

  formatDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

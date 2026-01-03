import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import {CalendarGrid} from '../../components/calendar-grid/calendar-grid';

@Component({
  standalone: true,
  selector: 'app-day-grid',
  imports: [
    CommonModule,
    CalendarGrid,

    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './day-grid.html',
  styleUrl: './day-grid.scss',
})
export class DayGrid {
  selectedDate = new Date(); // default: today

  prevDay() {
    this.selectedDate = this.addDays(this.selectedDate, -1);
  }

  nextDay() {
    this.selectedDate = this.addDays(this.selectedDate, 1);
  }

  today() {
    this.selectedDate = new Date();
  }

  onDatePicked(d: Date | null) {
    if (d) this.selectedDate = d;
  }

  private addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
}

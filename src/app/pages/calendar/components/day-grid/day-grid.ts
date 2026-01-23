import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';

import { Observable } from 'rxjs';

import { CalendarGrid } from '../calendar-grid/calendar-grid';
import {CurrentUser} from '../../../../core/models/current-user';
import {AuthApi} from '../../../../core/auth/auth-api';

type ViewMode = 'ALL' | 'MINE';

@Component({
  standalone: true,
  selector: 'app-day-grid',
  imports: [
    CommonModule,
    FormsModule,

    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,

    CalendarGrid,
  ],
  templateUrl: './day-grid.html',
  styleUrls: ['./day-grid.scss'],
})
export class DayGrid {
  user$!: Observable<CurrentUser | null>;

  viewMode: ViewMode = 'ALL';

  selectedDateIso = this.toIsoDate(new Date());
  selectedDate: Date = new Date();

  myEmployeeId = 0;

  constructor(private auth: AuthApi) {
    // init observable AFTER DI is ready
    this.user$ = this.auth.currentUser$();

    // initialize from stored user (if present)
    const u = this.auth.currentUser();
    this.myEmployeeId = u?.employeeId ?? 0;
    if (!this.myEmployeeId) this.viewMode = 'ALL';

    // keep in sync
    this.user$.subscribe((user) => {
      this.myEmployeeId = user?.employeeId ?? 0;
      if (!this.myEmployeeId && this.viewMode === 'MINE') {
        this.viewMode = 'ALL';
      }
    });
  }

  prevDay() {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() - 1);
    this.setPickedDate(d);
  }

  nextDay() {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + 1);
    this.setPickedDate(d);
  }

  today() {
    this.setPickedDate(new Date());
  }

  onDatePicked(d: Date | null) {
    if (!d) return;
    this.setPickedDate(d);
  }

  private setPickedDate(d: Date) {
    const normalized = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    this.selectedDate = normalized;
    this.selectedDateIso = this.toIsoDate(normalized);
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

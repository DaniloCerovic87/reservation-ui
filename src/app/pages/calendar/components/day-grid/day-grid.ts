import {Component, computed, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatTooltipModule} from '@angular/material/tooltip';

import {Observable} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {CalendarGrid} from '../calendar-grid/calendar-grid';
import {CurrentUser} from '../../../../core/models/current-user';
import {AuthApi} from '../../../../core/auth/auth-api';
import {I18nService} from '../../../../core/i18n/I18n.service';
import {TPipe} from '../../../../core/i18n/t.pipe';

type ViewMode = 'ALL' | 'MINE';
type Lang = 'sr' | 'en';

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
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    CalendarGrid,
    TPipe
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
  isAdmin = false;
  private destroyRef = inject(DestroyRef);
  lang: Lang = this.readLang();
  isLang = (l: 'sr' | 'en') => this.i18n.lang() === l;

  constructor(private auth: AuthApi, private i18n: I18nService) {

    this.user$ = this.auth.currentUser$();

    // initialize from stored user (if present)
    const u = this.auth.currentUser();
    this.myEmployeeId = u?.employeeId ?? 0;

    console.log("Da li je admin: ", this.isAdmin);
    this.isAdmin = u?.role === 'ADMIN';
    if (this.isAdmin) this.viewMode = 'ALL';

    if (!this.myEmployeeId) this.viewMode = 'ALL';

    // keep in sync (no memory leaks)
    this.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.myEmployeeId = user?.employeeId ?? 0;

        this.isAdmin = user?.role === 'ADMIN';

        if (this.isAdmin) {
          this.viewMode = 'ALL';
        }

        // safety: do not show MINE if employee id not present
        if (!this.myEmployeeId && this.viewMode === 'MINE') {
          this.viewMode = 'ALL';
        }
      });
  }

  logout() {
    this.auth.logout();
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

  // ===== LANGUAGE =====
  setLang(lang: Lang) {
    if (this.lang === lang) {
      return;
    }

    this.lang = lang;
    localStorage.setItem('app_lang', lang);

    void this.i18n.setLang(lang);
  }

  private readLang(): Lang {
    const v = (localStorage.getItem('app_lang') || '').toLowerCase();
    return v === 'en' ? 'en' : 'sr';
  }

  currentLangShort = computed(() => this.i18n.lang().toUpperCase()); // SR / EN

  currentLangLabel = computed(() =>
    this.i18n.lang() === 'sr' ? 'Srpski' : 'English'
  );


}

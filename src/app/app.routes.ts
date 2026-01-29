import {Routes} from '@angular/router';
import {Login} from './pages/login/login';
import {DayGrid} from './pages/calendar/components/day-grid/day-grid';
import {authGuard} from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: DayGrid, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];

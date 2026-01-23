import {Routes} from '@angular/router';
import {DayGrid} from './pages/calendar/components/day-grid/day-grid';
import {Login} from './pages/login/login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: DayGrid },
  { path: '**', redirectTo: '' },
];

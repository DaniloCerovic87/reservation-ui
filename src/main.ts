import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import {DayGrid} from './app/pages/day-grid/day-grid';


bootstrapApplication(DayGrid, {
  providers: [provideHttpClient()],
}).catch(err => console.error(err));

import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {CalendarEntryDto} from '../models/calendar-entry.dto';

@Injectable({
  providedIn: 'root',
})
export class CalendarApiService {
  private readonly baseUrl = '/api/calendar';

  constructor(private http: HttpClient) {}

  getDayEntries(date: string): Observable<CalendarEntryDto[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<CalendarEntryDto[]>(`${this.baseUrl}/day`, { params });
  }

}

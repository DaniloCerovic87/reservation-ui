import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {CalendarEntryResponse} from '../responses/calendar-entry.response';

@Injectable({
  providedIn: 'root',
})
export class CalendarApiService {
  private readonly baseUrl = '/api/calendar';

  constructor(private http: HttpClient) {}

  getDayEntries(date: string): Observable<CalendarEntryResponse[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<CalendarEntryResponse[]>(`${this.baseUrl}/day`, { params });
  }

}

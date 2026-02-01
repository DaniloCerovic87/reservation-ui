import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, tap} from 'rxjs';
import {CreateReservationRequest} from '../requests/create-reservation.request';
import {ReservationCreatedResponse} from '../responses/reservation-created.response';

@Injectable({providedIn: 'root'})
export class ReservationApiService {
  private readonly baseUrl = '/api/reservations';

  constructor(private http: HttpClient) {
  }

  busyRoomIds(startTime: string, endTime: string): Observable<number[]> {
    const params = new HttpParams()
      .set('startTime', startTime)
      .set('endTime', endTime);

    return this.http.get<number[]>(`${this.baseUrl}/busy-room-ids`, {params}).pipe(
      tap({
        next: (res) => console.log('busy-room-ids response:', res),
        error: (err) => console.error('busy-room-ids error:', err),
      })
    );
  }

  createReservation(req: CreateReservationRequest) {
    return this.http.post<ReservationCreatedResponse>('/api/reservations', req);
  }

  approveReservation(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/approve`, null).pipe(
      tap({
        next: () => console.log(`approveReservation OK (id=${id})`),
        error: (err) => console.error(`approveReservation error (id=${id})`, err),
      })
    );
  }

  declineReservation(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/decline`, null).pipe(
      tap({
        next: () => console.log(`declineReservation OK (id=${id})`),
        error: (err) => console.error(`declineReservation error (id=${id})`, err),
      })
    );
  }


}

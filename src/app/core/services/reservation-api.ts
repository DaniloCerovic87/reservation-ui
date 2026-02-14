import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { CreateReservationRequest } from '../requests/create-reservation.request';
import { ReservationCreatedResponse } from '../responses/reservation-created.response';

export interface ReviewReservationRequest {
  approveRoomIds: number[];
  declineRooms: Array<{
    roomId: number;
    comment: string;
  }>;
}


@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private readonly baseUrl = '/api/reservations';

  constructor(private http: HttpClient) {}

  busyRoomIds(startTime: string, endTime: string): Observable<number[]> {
    const params = new HttpParams()
      .set('startTime', startTime)
      .set('endTime', endTime);

    return this.http.get<number[]>(`${this.baseUrl}/busy-room-ids`, { params }).pipe(
      tap({
        next: (res) => console.log('busy-room-ids response:', res),
        error: (err) => console.error('busy-room-ids error:', err),
      })
    );
  }

  createReservation(req: CreateReservationRequest): Observable<ReservationCreatedResponse> {
    return this.http.post<ReservationCreatedResponse>(this.baseUrl, req).pipe(
      tap({
        next: (res) => console.log('createReservation OK:', res),
        error: (err) => console.error('createReservation error:', err),
      })
    );
  }

  /**
   * Review reservation rooms (approve/decline/pending per room).
   * POST /api/reservations/{reservationId}/review
   */
  reviewReservationRooms(reservationId: number, req: ReviewReservationRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${reservationId}/review`, req).pipe(
      tap({
        next: () => console.log(`reviewReservationRooms OK (reservationId=${reservationId})`),
        error: (err) => console.error(`reviewReservationRooms error (reservationId=${reservationId})`, err),
      })
    );
  }
}

import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {RoomDto} from '../responses/room.dto';


@Injectable({providedIn: 'root'})
export class RoomApiService {
  private readonly baseUrl = '/api/rooms';

  constructor(private http: HttpClient) {
  }

  getAllRooms(): Observable<RoomDto[]> {
    return this.http.get<RoomDto[]>(this.baseUrl);
  }

  getAvailableRooms(startTime: string, endTime: string) {
    const params = new HttpParams().set('startTime', startTime).set('endTime', endTime);
    return this.http.get<RoomDto[]>('/api/rooms/available', { params });
  }
}

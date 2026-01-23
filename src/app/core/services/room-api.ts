import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {RoomResponse} from '../responses/room.response';


@Injectable({providedIn: 'root'})
export class RoomApiService {
  private readonly baseUrl = '/api/rooms';

  constructor(private http: HttpClient) {
  }

  getAllRooms(): Observable<RoomResponse[]> {
    return this.http.get<RoomResponse[]>(this.baseUrl);
  }

}

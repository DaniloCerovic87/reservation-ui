import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {RoomDto} from '../models/room.dto';


@Injectable({providedIn: 'root'})
export class RoomApiService {
  private readonly baseUrl = '/api/rooms';

  constructor(private http: HttpClient) {
  }

  getAllRooms(): Observable<RoomDto[]> {
    return this.http.get<RoomDto[]>(this.baseUrl);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {AuthResponse} from '../responses/auth.response';
import {LoginRequest} from '../requests/login-request';
import {CurrentUser} from '../models/current-user';
import {Router} from '@angular/router';

const STORAGE_KEY = 'rr_current_user';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly user$ = new BehaviorSubject<CurrentUser | null>(this.readFromStorage());

  constructor(private http: HttpClient,
              private router: Router) {}

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', req).pipe(
      tap((res) => {
        const u: CurrentUser = {
          token: res.token,
          userId: res.userId,
          employeeId: res.employeeId,
          username: res.username,
          email: res.email,
          role: res.role,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        this.user$.next(u);
      })
    );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  private clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    this.user$.next(null);
  }

  currentUser$(): Observable<CurrentUser | null> {
    return this.user$.asObservable();
  }

  currentUser(): CurrentUser | null {
    return this.user$.value;
  }

  token(): string | null {
    return this.user$.value?.token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.user$.value?.token;
  }

  private readFromStorage(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }
}

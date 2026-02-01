import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {AuthResponse} from '../responses/auth.response';
import {LoginRequest} from '../requests/login-request';
import {CurrentUser} from '../models/current-user';
import {Router} from '@angular/router';

const STORAGE_KEY = 'rr_current_user';

@Injectable({providedIn: 'root'})
export class AuthApi {
  private readonly user$ = new BehaviorSubject<CurrentUser | null>(this.readFromStorage());
  private logoutTimer: any;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // init: if user is already in storage (page refresh), schedule auto logout
    const u = this.user$.value;
    if (u?.token) {
      this.scheduleAutoLogout(u.token);
    }
  }

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

        // schedule based on exp
        this.scheduleAutoLogout(res.token);
      })
    );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/login', {replaceUrl: true});
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

  private scheduleAutoLogout(token: string) {
    const expMs = this.extractJwtExpMs(token);
    if (!expMs) return;

    const nowMs = Date.now();
    const msUntilExpiry = Math.max(0, expMs - nowMs - 5000); // 5s buffer

    clearTimeout(this.logoutTimer);
    this.logoutTimer = setTimeout(() => this.logout(), msUntilExpiry);
  }

  private extractJwtExpMs(token: string): number | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;

      // base64url -> base64
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(json);
      const expSec: number | undefined = payload?.exp;
      if (!expSec) return null;

      return expSec * 1000;
    } catch {
      return null;
    }
  }

  private clearSession() {
    clearTimeout(this.logoutTimer);
    this.logoutTimer = null;

    localStorage.removeItem(STORAGE_KEY);
    this.user$.next(null);
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

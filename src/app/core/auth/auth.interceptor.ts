import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthApi } from './auth-api';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthApi) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // do not add token on login
    if (req.url.includes('/api/auth/login')) {
      return next.handle(req);
    }

    const token = this.auth.token();
    if (!token) return next.handle(req);

    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });

    return next.handle(authReq);
  }
}

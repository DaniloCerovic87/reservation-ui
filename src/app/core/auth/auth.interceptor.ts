import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthApi} from './auth-api';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthApi) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // do not add token on login
    if (req.url.includes('/api/auth/login')) {
      return next.handle(req);
    }

    const token = this.auth.token();
    const authReq = token
      ? req.clone({setHeaders: {Authorization: `Bearer ${token}`}})
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403) {
          this.auth.logout();
        }
        return throwError(() => err);
      })
    );
  }
}

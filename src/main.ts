import {bootstrapApplication} from '@angular/platform-browser';
import {HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {App} from './app/app';
import {provideRouter} from '@angular/router';
import {routes} from './app/app.routes';
import {AuthInterceptor} from './app/core/auth/auth.interceptor';
import {provideNativeDateAdapter} from '@angular/material/core';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    provideHttpClient(),
    provideRouter(routes),
    provideNativeDateAdapter()
  ],
}).catch(err => console.error(err));

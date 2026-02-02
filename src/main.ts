import {bootstrapApplication} from '@angular/platform-browser';
import {HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {App} from './app/app';
import {provideRouter} from '@angular/router';
import {routes} from './app/app.routes';
import {AuthInterceptor} from './app/core/auth/auth.interceptor';
import {provideNativeDateAdapter} from '@angular/material/core';
import {inject, provideAppInitializer} from '@angular/core';
import {I18nService} from './app/core/i18n/I18n.service';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    provideHttpClient(),
    provideRouter(routes),
    provideNativeDateAdapter(),
    provideAppInitializer(() => inject(I18nService).init('sr')),
  ],
}).catch(err => console.error(err));

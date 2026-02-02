import {
  ApplicationConfig, inject, provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideNativeDateAdapter} from '@angular/material/core';
import {I18nService} from './core/i18n/I18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideNativeDateAdapter(),
    provideAppInitializer(() => {
      const i18n = inject(I18nService);
      return i18n.init();
    }),
  ]
};

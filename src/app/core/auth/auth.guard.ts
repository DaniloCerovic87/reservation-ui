import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthApi} from './auth-api';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthApi);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {returnUrl: state.url},
  });
};

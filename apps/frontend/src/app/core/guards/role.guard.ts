import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed = route.data?.['roles'] as string[] | undefined;
  const role = auth.user?.role;

  if (!auth.isLoggedIn()) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (!allowed || allowed.includes(role || '')) return true;

  router.navigate(['/auth/login']);
  return false;
};

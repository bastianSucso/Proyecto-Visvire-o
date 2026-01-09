import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export type UserRole = 'ADMIN' | 'VENDEDOR';

interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string; role: UserRole };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private TOKEN_KEY = 'visvire_token';
  private USER_KEY = 'visvire_user';

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.accessToken);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        })
      );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/auth/login']);
  }

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get user(): { id: string; email: string; role: UserRole } | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }
}

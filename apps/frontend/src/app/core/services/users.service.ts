import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserRole } from './auth.service';

export interface UserDto {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);

  list() {
    return this.http.get<UserDto[]>('/api/users');
  }

  create(payload: { email: string; nombre?: string; apellido?: string; password: string; role: UserRole }) {
    return this.http.post<UserDto>('/api/users', payload);
  }

  update(id: string, payload: Partial<{ email: string; nombre?: string; apellido?: string; password?: string; role: UserRole; isActive: boolean }>) {
    return this.http.patch<UserDto>(`/api/users/${id}`, payload);
  }

  setActive(id: string, isActive: boolean) {
    return this.http.patch<UserDto>(`/api/users/${id}/active`, { isActive });
  }

  delete(id: string) {
    return this.http.delete<void>(`/api/users/${id}`);  
  }

}

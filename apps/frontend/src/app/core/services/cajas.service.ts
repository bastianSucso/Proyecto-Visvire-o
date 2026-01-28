import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CajaFisica {
  idCaja: number;
  numero: string;
  activa: boolean;
}

export interface CreateCajaDto {
  numero: string;
  activa?: boolean;
}

export interface UpdateCajaDto {
  numero?: string;
  activa?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CajasService {
  private http = inject(HttpClient);

  list(onlyActive = false) {
    return this.http.get<CajaFisica[]>(`/api/caja/admin?onlyActive=${onlyActive}`);
  }

  create(dto: CreateCajaDto) {
    return this.http.post<CajaFisica>('/api/caja/admin', dto);
  }

  update(idCaja: number, dto: UpdateCajaDto) {
    return this.http.patch<CajaFisica>(`/api/caja/admin/${idCaja}`, dto);
  }

  remove(idCaja: number) {
    return this.http.delete<{ ok: true }>(`/api/caja/admin/${idCaja}`);
  }
}

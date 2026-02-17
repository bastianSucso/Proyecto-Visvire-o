import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface EmpresaDto {
  id: string;
  rutEmpresa: string;
  nombreEmpresa: string;
  nombreContratista: string | null;
  correoContratista: string | null;
  fonoContratista: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmpresaDto {
  rutEmpresa: string;
  nombreEmpresa: string;
  nombreContratista?: string;
  correoContratista?: string;
  fonoContratista?: string;
}

export interface UpdateEmpresaDto {
  rutEmpresa?: string;
  nombreEmpresa?: string;
  nombreContratista?: string;
  correoContratista?: string;
  fonoContratista?: string;
}

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private http = inject(HttpClient);

  list() {
    return this.http.get<EmpresaDto[]>('/api/alojamiento/companies');
  }

  create(dto: CreateEmpresaDto) {
    return this.http.post<EmpresaDto>('/api/alojamiento/companies', dto);
  }

  update(id: string, dto: UpdateEmpresaDto) {
    return this.http.patch<EmpresaDto>(`/api/alojamiento/companies/${id}`, dto);
  }

  delete(id: string) {
    return this.http.delete<{ ok: true }>(`/api/alojamiento/companies/${id}`);
  }
}

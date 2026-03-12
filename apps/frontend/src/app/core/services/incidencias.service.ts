import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IncidenciaCategoriaRef {
  id: string;
  codigo: string;
  nombre: string;
  activa: boolean;
}

export interface IncidenciaDto {
  id: number;
  fecha: string;
  origen?: 'VENDEDOR' | 'ADMIN';
  categoria: IncidenciaCategoriaRef;
  cantidad: number;
  observacion: string | null;
  usuario?: {
    idUsuario?: string;
    nombre?: string | null;
    apellido?: string | null;
  };
  producto: {
    id: string;
    name: string;
    internalCode: string;
    unidadBase?: string | null;
    barcode?: string | null;
  };
  ubicacion?: { id: string; nombre: string; tipo: string };
  sesionCaja: { id: number; fechaApertura: string; fechaCierre: string | null };
}

export interface CreateIncidenciaStockDto {
  sesionCajaId: number;
  productoId: string;
  categoriaId: string;
  cantidad: number;
  observacion?: string;
}

@Injectable({ providedIn: 'root' })
export class IncidenciasService {
    private http = inject(HttpClient);

    crearIncidencia(dto: CreateIncidenciaStockDto): Observable<IncidenciaDto> {
    return this.http.post<IncidenciaDto>('/api/sesion-caja/incidencias', dto);
    }

    misIncidencias(): Observable<IncidenciaDto[]> {
        return this.http.get<IncidenciaDto[]>('/api/sesion-caja/incidencias/mias');
    }

    misIncidenciasTurno(): Observable<IncidenciaDto[]> {
        return this.http.get<IncidenciaDto[]>('/api/sesion-caja/incidencias/mias/turno');
    }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PisoZona {
  id: string;
  nombre: string;
  orden: number;
  anchoLienzo: number;
  altoLienzo: number;
  tamanoCuadricula: number;
  snapActivo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comodidad {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Cama {
  id: string;
  item: string;
  cantidad: number;
}

export interface InventarioHabitacion {
  id: string;
  item: string;
  cantidad: number;
  observacion: string | null;
}

export interface Habitacion {
  id: string;
  identificador: string;
  precio: string;
  estadoActivo: boolean;
  posX: number;
  posY: number;
  ancho: number;
  alto: number;
  comodidades: Comodidad[];
  camas: Cama[];
  inventarios: InventarioHabitacion[];
}

export interface CreatePisoZonaDto {
  nombre: string;
  orden?: number;
  anchoLienzo?: number;
  altoLienzo?: number;
  tamanoCuadricula?: number;
  snapActivo?: boolean;
}

export interface UpdatePisoZonaDto {
  nombre?: string;
  orden?: number;
  anchoLienzo?: number;
  altoLienzo?: number;
  tamanoCuadricula?: number;
  snapActivo?: boolean;
}

export interface CamaInputDto {
  item: string;
  cantidad: number;
}

export interface InventarioInputDto {
  item: string;
  cantidad: number;
  observacion?: string;
}

export interface CreateHabitacionDto {
  identificador: string;
  precio: number;
  estadoActivo?: boolean;
  posX: number;
  posY: number;
  ancho: number;
  alto: number;
  comodidades?: string[];
  camas?: CamaInputDto[];
  inventario?: InventarioInputDto[];
  allowOverlap?: boolean;
}

export interface UpdateHabitacionDto {
  identificador?: string;
  precio?: number;
  estadoActivo?: boolean;
  posX?: number;
  posY?: number;
  ancho?: number;
  alto?: number;
  comodidades?: string[];
  camas?: CamaInputDto[];
  inventario?: InventarioInputDto[];
  allowOverlap?: boolean;
}

export interface CreateComodidadDto {
  nombre: string;
  descripcion?: string;
  activa?: boolean;
}

export interface UpdateComodidadDto {
  nombre?: string;
  descripcion?: string;
  activa?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AlojamientoService {
  private http = inject(HttpClient);

  listPisos() {
    return this.http.get<PisoZona[]>('/api/alojamiento/floors');
  }

  createPiso(dto: CreatePisoZonaDto) {
    return this.http.post<PisoZona>('/api/alojamiento/floors', dto);
  }

  updatePiso(id: string, dto: UpdatePisoZonaDto) {
    return this.http.patch<PisoZona>(`/api/alojamiento/floors/${id}`, dto);
  }

  removePiso(id: string) {
    return this.http.delete<{ ok: true }>(`/api/alojamiento/floors/${id}`);
  }

  listHabitaciones(pisoId: string) {
    return this.http.get<Habitacion[]>(`/api/alojamiento/floors/${pisoId}/rooms`);
  }

  createHabitacion(pisoId: string, dto: CreateHabitacionDto) {
    return this.http.post<Habitacion>(`/api/alojamiento/floors/${pisoId}/rooms`, dto);
  }

  updateHabitacion(id: string, dto: UpdateHabitacionDto) {
    return this.http.patch<Habitacion>(`/api/alojamiento/rooms/${id}`, dto);
  }

  removeHabitacion(id: string) {
    return this.http.delete<{ ok: true }>(`/api/alojamiento/rooms/${id}`);
  }

  bulkRemoveHabitaciones(ids: string[]) {
    return this.http.post<{ ok: true }>(`/api/alojamiento/rooms/bulk-delete`, { ids });
  }

  listComodidades(includeInactive = true) {
    return this.http.get<Comodidad[]>(
      `/api/alojamiento/amenities?includeInactive=${includeInactive}`,
    );
  }

  createComodidad(dto: CreateComodidadDto) {
    return this.http.post<Comodidad>('/api/alojamiento/amenities', dto);
  }

  updateComodidad(id: string, dto: UpdateComodidadDto) {
    return this.http.patch<Comodidad>(`/api/alojamiento/amenities/${id}`, dto);
  }

  removeComodidad(id: string) {
    return this.http.delete<{ ok: true }>(`/api/alojamiento/amenities/${id}`);
  }

}

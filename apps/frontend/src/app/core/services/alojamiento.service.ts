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
  pisoZona?: PisoZona;
}

export interface EmpresaHostal {
  id: string;
  nombreEmpresa: string;
  nombreContratista: string | null;
  correoContratista: string | null;
  fonoContratista: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Huesped {
  id: string;
  nombreCompleto: string;
  correo: string | null;
  rut: string | null;
  observacion: string | null;
  telefono: string | null;
  empresaHostal: EmpresaHostal | null;
  createdAt: string;
  updatedAt: string;
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

export interface CreateEmpresaHostalDto {
  nombreEmpresa: string;
  nombreContratista?: string;
  correoContratista?: string;
  fonoContratista?: string;
}

export interface CreateHuespedDto {
  nombreCompleto: string;
  correo?: string;
  rut?: string;
  observacion?: string;
  telefono?: string;
  empresaHostalId?: string;
}

export interface UpdateHuespedDto {
  nombreCompleto?: string;
  correo?: string;
  rut?: string;
  observacion?: string;
  telefono?: string;
  empresaHostalId?: string;
}

export interface CreateAsignacionHabitacionDto {
  habitacionId: string;
  huespedId: string;
  fechaIngreso: string;
  fechaSalidaEstimada: string;
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

  listEmpresas() {
    return this.http.get<EmpresaHostal[]>('/api/alojamiento/companies');
  }

  createEmpresa(dto: CreateEmpresaHostalDto) {
    return this.http.post<EmpresaHostal>('/api/alojamiento/companies', dto);
  }

  listHuespedes() {
    return this.http.get<Huesped[]>('/api/alojamiento/guests');
  }

  createHuesped(dto: CreateHuespedDto) {
    return this.http.post<Huesped>('/api/alojamiento/guests', dto);
  }

  updateHuesped(id: string, dto: UpdateHuespedDto) {
    return this.http.patch<Huesped>(`/api/alojamiento/guests/${id}`, dto);
  }

  searchHuespedes(search: string) {
    const q = encodeURIComponent(search);
    return this.http.get<Huesped[]>(`/api/alojamiento/guests?search=${q}`);
  }

  listDisponibles(from: string, to: string) {
    const fromParam = encodeURIComponent(from);
    const toParam = encodeURIComponent(to);
    return this.http.get<Habitacion[]>(
      `/api/alojamiento/rooms/available?from=${fromParam}&to=${toParam}`,
    );
  }

  createAsignacion(dto: CreateAsignacionHabitacionDto) {
    return this.http.post('/api/alojamiento/assignments', dto);
  }

}

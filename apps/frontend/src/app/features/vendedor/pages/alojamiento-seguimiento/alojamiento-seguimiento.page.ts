import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AlojamientoService,
  AsignacionDetalle,
  AsignacionHistorialEstado,
  AsignacionHistorialItem,
  HabitacionEstadoTimeline,
  ReservaHabitacion,
  ReservaHabitacionEstado,
  RoomStateChangeItem,
  RoomStateChangeGroup,
} from '../../../../core/services/alojamiento.service';

@Component({
  selector: 'app-alojamiento-seguimiento-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './alojamiento-seguimiento.page.html',
})
export class AlojamientoSeguimientoPage implements OnInit {
  private alojamientoService = inject(AlojamientoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  tab: 'cambios' | 'reservas' | 'asignaciones' = 'cambios';

  stateChangesByDay: RoomStateChangeGroup[] = [];
  reservas: ReservaHabitacion[] = [];
  asignaciones: AsignacionHistorialItem[] = [];

  rangeFrom = '';
  rangeTo = '';
  reservasEstadoFiltro: '' | ReservaHabitacionEstado = '';
  reservasBusqueda = '';
  asignacionesEstadoFiltro: '' | AsignacionHistorialEstado = '';
  asignacionesFrom = '';
  asignacionesTo = '';
  roomFilter = '';

  loadingChanges = false;
  loadingReservas = false;
  loadingAsignaciones = false;
  assignmentDetailOpen = false;
  assignmentDetailLoading = false;
  assignmentDetailError = '';
  assignmentDetail: AsignacionDetalle | null = null;

  errorMsg = '';

  get volverRoute() {
    if (this.route.snapshot.data['mode'] === 'admin' || this.router.url.startsWith('/admin/')) {
      return '/admin/alojamiento';
    }
    return '/pos/alojamiento';
  }

  ngOnInit() {
    this.setDefaultRange();
    this.loadStateChanges();
    this.loadReservas();
    this.loadAsignaciones();
  }

  private setDefaultRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    this.rangeFrom = this.formatDatetimeLocal(start);
    this.rangeTo = this.formatDatetimeLocal(end);
  }

  private formatDatetimeLocal(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  loadStateChanges() {
    if (!this.rangeFrom || !this.rangeTo) return;
    this.loadingChanges = true;
    this.alojamientoService.listRoomStateChanges(this.rangeFrom, this.rangeTo).subscribe({
      next: (data) => {
        this.stateChangesByDay = data ?? [];
        if (this.roomFilter && !this.roomFilterOptions.some((room) => room.id === this.roomFilter)) {
          this.roomFilter = '';
        }
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo consultar cambios de estado.'));
      },
      complete: () => (this.loadingChanges = false),
    });
  }

  loadReservas() {
    this.loadingReservas = true;
    const estado = this.reservasEstadoFiltro || undefined;
    const search = this.reservasBusqueda.trim() || undefined;
    this.alojamientoService.listReservas(undefined, undefined, estado, search).subscribe({
      next: (data) => {
        this.reservas = data ?? [];
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudieron cargar las reservas.'));
      },
      complete: () => (this.loadingReservas = false),
    });
  }

  loadAsignaciones() {
    if ((this.asignacionesFrom && !this.asignacionesTo) || (!this.asignacionesFrom && this.asignacionesTo)) {
      this.setError('Debes indicar ambas fechas o ninguna para filtrar asignaciones.');
      return;
    }

    this.loadingAsignaciones = true;
    const estado = this.asignacionesEstadoFiltro || undefined;
    const from = this.asignacionesFrom || undefined;
    const to = this.asignacionesTo || undefined;
    this.alojamientoService.listAssignments(from, to, estado).subscribe({
      next: (data) => {
        this.asignaciones = data ?? [];
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudieron cargar las asignaciones.'));
      },
      complete: () => (this.loadingAsignaciones = false),
    });
  }

  onRangeChange() {
    this.loadStateChanges();
  }

  onRoomFilterChange() {}

  onReservasFilterChange() {
    this.loadReservas();
  }

  onAsignacionesFilterChange() {
    this.loadAsignaciones();
  }

  clearAsignacionesDateRange() {
    this.asignacionesFrom = '';
    this.asignacionesTo = '';
    this.loadAsignaciones();
  }

  refreshCurrentTab() {
    if (this.tab === 'cambios') {
      this.loadStateChanges();
      return;
    }
    if (this.tab === 'reservas') {
      this.loadReservas();
      return;
    }
    this.loadAsignaciones();
  }

  canOpenAssignmentDetail(item: RoomStateChangeItem) {
    if (!item.asignacionId) return false;
    return (
      item.accion === 'ASIGNACION_CREADA' ||
      item.accion === 'CHECKOUT_MANUAL' ||
      item.accion === 'CHECKOUT_AUTOMATICO'
    );
  }

  openAssignmentDetail(item: RoomStateChangeItem) {
    if (!this.canOpenAssignmentDetail(item) || !item.asignacionId) return;
    this.openAssignmentDetailById(item.asignacionId);
  }

  openAssignmentDetailById(asignacionId: string) {
    this.assignmentDetailOpen = true;
    this.assignmentDetailLoading = true;
    this.assignmentDetailError = '';
    this.assignmentDetail = null;

    this.alojamientoService.getAssignmentById(asignacionId).subscribe({
      next: (data) => {
        this.assignmentDetail = data;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.assignmentDetailError = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cargar la asignación.');
      },
      complete: () => {
        this.assignmentDetailLoading = false;
      },
    });
  }

  closeAssignmentDetail() {
    this.assignmentDetailOpen = false;
    this.assignmentDetailLoading = false;
    this.assignmentDetailError = '';
    this.assignmentDetail = null;
  }

  accionLabel(accion: string) {
    const labels: Record<string, string> = {
      ASIGNACION_CREADA: 'Ingreso registrado',
      CHECKOUT_MANUAL: 'Checkout manual',
      CHECKOUT_AUTOMATICO: 'Checkout automatico',
      LIMPIEZA_FINALIZADA: 'Limpieza finalizada',
      HABITACION_ACTIVADA: 'Habitacion activada',
      HABITACION_INACTIVADA: 'Habitacion inactivada',
      ESTADO_OPERATIVO_ACTUALIZADO: 'Estado operativo actualizado',
    };
    return labels[accion] ?? accion;
  }

  formatDay(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  formatDateTime(value: string) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  statusClass(status: ReservaHabitacionEstado) {
    if (status === 'ACTIVA') return 'bg-emerald-100 text-emerald-700';
    if (status === 'CANCELADA') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-200 text-slate-700';
  }

  assignmentStatusClass(status: AsignacionHistorialEstado) {
    if (status === 'ACTIVA') return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-200 text-slate-700';
  }

  assignmentStatusLabel(status: AsignacionHistorialEstado) {
    if (status === 'FINALIZADA') return 'Finalizada';
    return 'Activa';
  }

  get roomFilterOptions() {
    const rooms = new Map<string, string>();
    for (const group of this.stateChangesByDay) {
      for (const item of group.items) {
        rooms.set(item.habitacion.id, item.habitacion.identificador);
      }
    }

    return Array.from(rooms.entries())
      .map(([id, identificador]) => ({ id, identificador }))
      .sort((a, b) => a.identificador.localeCompare(b.identificador, 'es-CL', { numeric: true }));
  }

  get filteredStateChangesByDay() {
    if (!this.roomFilter) return this.stateChangesByDay;
    return this.stateChangesByDay
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.habitacion.id === this.roomFilter),
      }))
      .filter((group) => group.items.length > 0);
  }

  estadoBadgeClass(estado: HabitacionEstadoTimeline) {
    if (estado === 'DISPONIBLE') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    if (estado === 'OCUPADA') return 'border-amber-300 bg-amber-50 text-amber-700';
    if (estado === 'EN_LIMPIEZA') return 'border-sky-300 bg-sky-50 text-sky-700';
    return 'border-slate-300 bg-slate-100 text-slate-700';
  }

  estadoLabel(estado: HabitacionEstadoTimeline) {
    if (estado === 'EN_LIMPIEZA') return 'EN LIMPIEZA';
    return estado;
  }

  tipoCobroLabel(tipo: AsignacionDetalle['estadia']['tipoCobro']) {
    if (tipo === 'EMPRESA_CONVENIO') return 'Convenio empresa';
    return 'Cobro directo';
  }

  estadoAsignacionLabel(estado: AsignacionDetalle['estadia']['estado']) {
    if (estado === 'FINALIZADA') return 'Finalizada';
    return 'Activa';
  }

  medioPagoLabel(medioPago?: 'EFECTIVO' | 'TARJETA' | null) {
    if (!medioPago) return '-';
    if (medioPago === 'EFECTIVO') return 'Efectivo';
    return 'Tarjeta';
  }

  formatCurrency(value?: string | null) {
    if (!value) return '-';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '-';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  }

  private setError(message: string) {
    this.errorMsg = message;
  }

  private clearMessages() {
    this.errorMsg = '';
  }
}

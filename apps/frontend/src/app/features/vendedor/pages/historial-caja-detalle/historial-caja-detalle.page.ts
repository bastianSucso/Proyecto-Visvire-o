import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CajaService, CajaResumenResponse } from '../../../../core/services/caja.service';
import { VentasService, VentaListItem } from '../../../../core/services/ventas.service';
import {
  AlojamientoService,
  AsignacionDetalle,
  VentaAlojamientoTurnoItem,
} from '../../../../core/services/alojamiento.service';
import { forkJoin } from 'rxjs';

type HistorialVentaItem = {
  tipo: 'VENTA' | 'ALOJAMIENTO';
  idRef: number;
  asignacionId: string | null;
  fecha: Date;
  medioPago: 'EFECTIVO' | 'TARJETA' | null;
  detalle: string;
  total: number;
};

@Component({
  selector: 'app-historial-caja-detalle-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historial-caja-detalle.page.html',
})
export class HistorialCajaDetallePage {
  private cajaService = inject(CajaService);
  private ventasService = inject(VentasService);
  private alojamientoService = inject(AlojamientoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resumen: CajaResumenResponse | null = null;
  ventas: VentaListItem[] = [];
  ventasAlojamiento: VentaAlojamientoTurnoItem[] = [];
  loading = false;
  errorMsg = '';
  alojamientoDetailOpen = false;
  alojamientoDetailLoading = false;
  alojamientoDetailError = '';
  selectedAlojamientoVenta: VentaAlojamientoTurnoItem | null = null;
  selectedAlojamientoAsignacionDetalle: AsignacionDetalle | null = null;

  private toNumberMoney(v: unknown): number {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  get ventasConfirmadas(): HistorialVentaItem[] {
    const ventasProductos = (this.ventas ?? []).map((v) => ({
      tipo: 'VENTA' as const,
      idRef: v.idVenta,
      asignacionId: null as string | null,
      fecha: new Date(v.fechaConfirmacion ?? v.fechaCreacion),
      medioPago: v.medioPago,
      detalle: `${v.cantidadTotal} item(s)`,
      total: this.toNumberMoney(v.totalVenta),
    }));

    const ventasAlojamiento = (this.ventasAlojamiento ?? []).map((v) => ({
      tipo: 'ALOJAMIENTO' as const,
      idRef: v.idVentaAlojamiento,
      asignacionId: v.asignacion.id,
      fecha: new Date(v.fechaConfirmacion),
      medioPago: v.medioPago,
      detalle: `${v.asignacion.habitacion.identificador} · ${v.asignacion.huesped.nombreCompleto}`,
      total: this.toNumberMoney(v.montoTotal),
    }));

    return [...ventasProductos, ...ventasAlojamiento].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = Number(raw);
    if (!id || Number.isNaN(id)) {
      this.errorMsg = 'Sesión inválida.';
      return;
    }

    this.loading = true;
    this.cajaService.resumenSesion(id).subscribe({
      next: (data) => (this.resumen = data),
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'No se pudo cargar el resumen.';
      },
      complete: () => (this.loading = false),
    });

    forkJoin({
      ventas: this.ventasService.listar(id),
      alojamientos: this.alojamientoService.listVentasAlojamientoSesion(id),
    }).subscribe({
      next: ({ ventas, alojamientos }) => {
        this.ventas = (ventas ?? []).filter((v) => v.estado === 'CONFIRMADA');
        this.ventasAlojamiento = alojamientos ?? [];
      },
      error: () => {},
    });
  }

  volver() {
    this.router.navigate(['/pos/historial-caja']);
  }

  verVentaConfirmada(item: HistorialVentaItem) {
    if (item.tipo === 'VENTA') {
      this.router.navigate(['/pos/ventas', item.idRef]);
      return;
    }
    if (!item.asignacionId) return;

    const ventaAlojamiento = this.ventasAlojamiento.find((v) => v.idVentaAlojamiento === item.idRef);
    if (!ventaAlojamiento) {
      this.errorMsg = 'No se encontró la venta de alojamiento seleccionada.';
      return;
    }

    this.selectedAlojamientoVenta = ventaAlojamiento;
    this.selectedAlojamientoAsignacionDetalle = null;
    this.alojamientoDetailError = '';
    this.alojamientoDetailOpen = true;
    this.alojamientoDetailLoading = true;

    this.alojamientoService.getAssignmentById(item.asignacionId).subscribe({
      next: (data) => {
        this.selectedAlojamientoAsignacionDetalle = data;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.alojamientoDetailError = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cargar el detalle de la asignación.');
      },
      complete: () => {
        this.alojamientoDetailLoading = false;
      },
    });
  }

  closeAlojamientoDetailModal() {
    this.alojamientoDetailOpen = false;
    this.alojamientoDetailLoading = false;
    this.alojamientoDetailError = '';
    this.selectedAlojamientoVenta = null;
    this.selectedAlojamientoAsignacionDetalle = null;
  }

  medioPagoLabel(medioPago?: 'EFECTIVO' | 'TARJETA' | null) {
    if (!medioPago) return '-';
    if (medioPago === 'EFECTIVO') return 'Efectivo';
    return 'Tarjeta';
  }

  estadoAsignacionLabel(estado?: AsignacionDetalle['estadia']['estado'] | null) {
    if (!estado) return '-';
    if (estado === 'FINALIZADA') return 'Finalizada';
    return 'Activa';
  }

  tipoCobroLabel(tipo?: AsignacionDetalle['estadia']['tipoCobro'] | null) {
    if (!tipo) return '-';
    if (tipo === 'EMPRESA_CONVENIO') return 'Convenio empresa';
    return 'Cobro directo';
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  FinanzasService,
  JornadaReporteVentasDetalle,
  JornadaReporteVentasDetalleVenta,
  ReporteVentasDiarioDetalleResponse,
  ReporteVentasDiarioResumen,
  VentaAlojamientoDetalleAdminResponse,
  VentaPosDetalleAdminResponse,
} from '../../../../core/services/finanzas.service';

@Component({
  selector: 'app-reporte-ventas-detalle-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reporte-ventas-detalle.page.html',
})
export class ReporteVentasDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly finanzasService = inject(FinanzasService);

  fecha = '';
  jornadas: JornadaReporteVentasDetalle[] = [];
  resumen: ReporteVentasDiarioResumen = {
    cantidadJornadas: 0,
    totalVentas: 0,
    cantidadVentas: 0,
    gananciaBruta: 0,
    totalEfectivo: 0,
    totalTarjeta: 0,
  };

  loading = false;
  errorMsg = '';
  private readonly expandedJornadas = new Set<number>();

  ventaPosModalOpen = false;
  ventaPosLoading = false;
  ventaPosError = '';
  ventaPosDetalle: VentaPosDetalleAdminResponse | null = null;

  ventaAlojModalOpen = false;
  ventaAlojLoading = false;
  ventaAlojError = '';
  ventaAlojDetalle: VentaAlojamientoDetalleAdminResponse | null = null;

  ngOnInit(): void {
    const fecha = this.route.snapshot.paramMap.get('fecha') ?? '';
    this.fecha = fecha;
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.expandedJornadas.clear();

    this.finanzasService.obtenerReporteVentasDetalleDia(this.fecha).subscribe({
      next: (res: ReporteVentasDiarioDetalleResponse) => {
        this.jornadas = res.jornadas ?? [];
        this.resumen = res.resumenDia ?? {
          cantidadJornadas: 0,
          totalVentas: 0,
          cantidadVentas: 0,
          gananciaBruta: 0,
          totalEfectivo: 0,
          totalTarjeta: 0,
        };
      },
      error: (err) => {
        this.jornadas = [];
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cargar el detalle del dia.');
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  toggleJornada(sesionCajaId: number) {
    if (this.expandedJornadas.has(sesionCajaId)) {
      this.expandedJornadas.delete(sesionCajaId);
      return;
    }
    this.expandedJornadas.add(sesionCajaId);
  }

  isExpanded(sesionCajaId: number) {
    return this.expandedJornadas.has(sesionCajaId);
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value ?? 0);
  }

  dateLabel(dateKey: string) {
    if (!dateKey) return '-';
    const [year, month, day] = dateKey.split('-').map((it) => Number(it));
    const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'full',
      timeZone: 'America/Santiago',
    }).format(utc);
  }

  datetimeLabel(value: string | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Santiago',
    }).format(new Date(value));
  }

  responsableLabel(jornada: JornadaReporteVentasDetalle) {
    const nombre = jornada.responsableCierre?.nombre?.trim();
    if (nombre) return nombre;
    return jornada.responsableCierre?.email ?? 'No informado';
  }

  ventaTipoLabel(tipo: 'VENTA_POS' | 'VENTA_ALOJAMIENTO') {
    return tipo === 'VENTA_POS' ? 'VENTA' : 'ALOJAMIENTO';
  }

  medioPagoLabel(medioPago?: 'EFECTIVO' | 'TARJETA' | null) {
    if (!medioPago) return '-';
    if (medioPago === 'EFECTIVO') return 'Efectivo';
    return 'Tarjeta';
  }

  verOperacion(venta: JornadaReporteVentasDetalleVenta) {
    if (venta.tipo === 'VENTA_POS') {
      this.openVentaPosModal(venta.ventaId);
      return;
    }

    this.openVentaAlojModal(venta.ventaId);
  }

  openVentaPosModal(ventaId: number) {
    this.ventaPosModalOpen = true;
    this.ventaPosLoading = true;
    this.ventaPosError = '';
    this.ventaPosDetalle = null;

    this.finanzasService.obtenerDetalleVentaPos(ventaId).subscribe({
      next: (res) => {
        this.ventaPosDetalle = res;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.ventaPosError = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cargar el detalle de la venta POS.');
      },
      complete: () => {
        this.ventaPosLoading = false;
      },
    });
  }

  closeVentaPosModal() {
    this.ventaPosModalOpen = false;
    this.ventaPosLoading = false;
    this.ventaPosError = '';
    this.ventaPosDetalle = null;
  }

  openVentaAlojModal(ventaAlojamientoId: number) {
    this.ventaAlojModalOpen = true;
    this.ventaAlojLoading = true;
    this.ventaAlojError = '';
    this.ventaAlojDetalle = null;

    this.finanzasService.obtenerDetalleVentaAlojamiento(ventaAlojamientoId).subscribe({
      next: (res) => {
        this.ventaAlojDetalle = res;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.ventaAlojError = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cargar el detalle de la venta de alojamiento.');
      },
      complete: () => {
        this.ventaAlojLoading = false;
      },
    });
  }

  closeVentaAlojModal() {
    this.ventaAlojModalOpen = false;
    this.ventaAlojLoading = false;
    this.ventaAlojError = '';
    this.ventaAlojDetalle = null;
  }

  ventaPosDetailEmpty() {
    return (this.ventaPosDetalle?.items?.length ?? 0) === 0;
  }

  estadoAsignacionLabel(estado?: VentaAlojamientoDetalleAdminResponse['asignacion']['estado'] | null) {
    if (!estado) return '-';
    if (estado === 'FINALIZADA') return 'Finalizada';
    return 'Activa';
  }

  tipoCobroLabel(tipo?: VentaAlojamientoDetalleAdminResponse['asignacion']['tipoCobro'] | null) {
    if (!tipo) return '-';
    if (tipo === 'EMPRESA_CONVENIO') return 'Convenio empresa';
    return 'Cobro directo';
  }

}

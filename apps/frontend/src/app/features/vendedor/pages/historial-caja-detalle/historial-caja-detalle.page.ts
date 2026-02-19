import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CajaService, CajaResumenResponse } from '../../../../core/services/caja.service';
import { VentasService, VentaListItem } from '../../../../core/services/ventas.service';
import {
  AlojamientoService,
  VentaAlojamientoTurnoItem,
} from '../../../../core/services/alojamiento.service';
import { forkJoin } from 'rxjs';

type HistorialVentaItem = {
  tipo: 'VENTA' | 'ALOJAMIENTO';
  idRef: number;
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

  private toNumberMoney(v: unknown): number {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  get ventasConfirmadas(): HistorialVentaItem[] {
    const ventasProductos = (this.ventas ?? []).map((v) => ({
      tipo: 'VENTA' as const,
      idRef: v.idVenta,
      fecha: new Date(v.fechaConfirmacion ?? v.fechaCreacion),
      medioPago: v.medioPago,
      detalle: `${v.cantidadTotal} item(s)`,
      total: this.toNumberMoney(v.totalVenta),
    }));

    const ventasAlojamiento = (this.ventasAlojamiento ?? []).map((v) => ({
      tipo: 'ALOJAMIENTO' as const,
      idRef: v.idVentaAlojamiento,
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
}

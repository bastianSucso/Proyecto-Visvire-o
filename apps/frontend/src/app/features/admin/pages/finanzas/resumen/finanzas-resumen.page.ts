import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  FinanzasService,
  MovimientoFinanciero,
  ResumenFinancieroResponse,
} from '../../../../../core/services/finanzas.service';

@Component({
  selector: 'app-finanzas-resumen-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './finanzas-resumen.page.html',
})
export class FinanzasResumenPage implements OnInit {
  private readonly finanzasService = inject(FinanzasService);

  periodo: 'hoy' | 'semana' | 'mes' = 'mes';
  from = '';
  to = '';

  resumen: ResumenFinancieroResponse | null = null;
  movimientos: MovimientoFinanciero[] = [];

  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  loading = false;
  movimientosLoading = false;
  errorMsg = '';

  ngOnInit(): void {
    this.load();
  }

  get totalItems() {
    return this.movimientos.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): MovimientoFinanciero[] {
    const start = (this.page - 1) * this.pageSize;
    return this.movimientos.slice(start, start + this.pageSize);
  }

  get fromItem() {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toItem() {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  onPageSizeChange() {
    this.page = 1;
  }

  first() { this.page = 1; }
  prev() { this.page = Math.max(1, this.page - 1); }
  next() { this.page = Math.min(this.totalPages, this.page + 1); }
  last() { this.page = this.totalPages; }

  clearCustomRange() {
    this.from = '';
    this.to = '';
    this.load();
  }

  load() {
    this.loading = true;
    this.movimientosLoading = true;
    this.errorMsg = '';

    this.finanzasService
      .obtenerResumen(this.periodo, this.from || undefined, this.to || undefined)
      .subscribe({
        next: (res) => {
          this.resumen = res;
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo cargar el resumen financiero.');
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });

    this.finanzasService
      .listarMovimientos({
        from: this.from || undefined,
        to: this.to || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.movimientos = rows;
          this.page = 1;
        },
        error: () => {
          this.movimientos = [];
          this.movimientosLoading = false;
        },
        complete: () => {
          this.movimientosLoading = false;
        },
      });
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value ?? 0);
  }

  estadoIvaLabel(estado: string) {
    if (estado === 'IVA_A_PAGAR') return 'IVA a pagar';
    if (estado === 'REMANENTE_A_FAVOR') return 'Remanente a favor';
    return 'Sin diferencia';
  }

  origenTipoLabel(origenTipo: string) {
    if (origenTipo === 'INVENTARIO_INGRESO') return 'COMPRA_PRODUCTOS_INSUMOS';
    return origenTipo;
  }
}

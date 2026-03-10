import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Producto, ProductosService } from '../../../../../core/services/productos.service';
import {
  InconsistenciaCategoria,
  InconsistenciaContexto,
  InconsistenciaListItem,
  InconsistenciaDetalle,
  InconsistenciaEstado,
  InconsistenciasAdminService,
} from '../../../../../core/services/inconsistencias-admin.service';

@Component({
  selector: 'app-inconsistencias-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inconsistencias-admin.page.html',
})
export class InconsistenciasAdminPage implements OnInit {
  private readonly api = inject(InconsistenciasAdminService);
  private readonly productosService = inject(ProductosService);

  loading = false;
  saving = false;
  errorMsg = '';

  estadoFiltro: InconsistenciaEstado | '' = '';
  fechaFiltro = '';
  modalNuevaOpen = false;

  items: InconsistenciaListItem[] = [];
  selected: InconsistenciaDetalle | null = null;
  productos: Producto[] = [];

  contextoNuevo: InconsistenciaContexto = 'DURANTE_JORNADA';
  sesionCajaNueva: number | null = null;
  productoNuevo = '';
  tipoNuevo: InconsistenciaCategoria = 'FALTANTE';
  cantidadNueva = 1;
  stockTeoricoNuevo = 0;
  stockRealNuevo = 0;
  observacionNueva = '';

  bitacoraTexto = '';
  cambioEstado: InconsistenciaEstado = 'EN_REVISION';
  motivoAjuste = '';
  cantidadAjuste = 0;

  ngOnInit(): void {
    this.productosService.list(true).subscribe({
      next: (rows) => {
        this.productos = rows ?? [];
      },
      error: () => {},
    });
    this.cargar();
  }

  onFiltersChange() {
    this.cargar();
  }

  openNuevaModal() {
    this.modalNuevaOpen = true;
    this.errorMsg = '';
    this.contextoNuevo = 'DURANTE_JORNADA';
    this.sesionCajaNueva = null;
    this.productoNuevo = '';
    this.tipoNuevo = 'FALTANTE';
    this.cantidadNueva = 1;
    this.stockTeoricoNuevo = 0;
    this.stockRealNuevo = 0;
    this.observacionNueva = '';
  }

  closeNuevaModal() {
    this.modalNuevaOpen = false;
  }

  crearInconsistencia() {
    if (!this.productoNuevo) {
      this.errorMsg = 'Debes seleccionar un producto.';
      return;
    }
    if (!this.observacionNueva.trim()) {
      this.errorMsg = 'Debes indicar una observación.';
      return;
    }
    this.saving = true;
    this.api
      .crear({
        contexto: this.contextoNuevo,
        sesionCajaId: this.contextoNuevo === 'DURANTE_JORNADA' ? this.sesionCajaNueva ?? undefined : undefined,
        productoId: this.productoNuevo,
        tipo: this.tipoNuevo,
        cantidad: this.cantidadNueva,
        observacion: this.observacionNueva.trim(),
        stockTeorico: this.stockTeoricoNuevo,
        stockRealObservado: this.stockRealNuevo,
      })
      .subscribe({
        next: (detail: InconsistenciaDetalle) => {
          this.selected = detail;
          this.observacionNueva = '';
          this.cantidadNueva = 1;
          this.stockTeoricoNuevo = 0;
          this.stockRealNuevo = 0;
          this.modalNuevaOpen = false;
          this.cargar();
        },
        error: (err: any) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg)
            ? msg.join(' | ')
            : (msg ?? 'No se pudo registrar inconsistencia.');
        },
        complete: () => (this.saving = false),
      });
  }

  cargar() {
    this.loading = true;
    this.errorMsg = '';
    this.api
      .listar({
        estado: this.estadoFiltro || undefined,
        fecha: this.fechaFiltro || undefined,
      })
      .subscribe({
        next: (rows: InconsistenciaListItem[]) => {
          this.items = rows ?? [];
          if (this.items.length === 0) {
            this.selected = null;
            return;
          }
          const selectedId = this.selected?.id;
          const newSelection =
            this.items.find((it) => it.id === selectedId) ??
            this.items[0];
          this.verDetalle(newSelection.id);
        },
        error: (err: any) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo cargar inconsistencias.');
        },
        complete: () => (this.loading = false),
      });
  }

  verDetalle(id: number) {
    this.api.detalle(id).subscribe({
      next: (detail: InconsistenciaDetalle) => {
        this.selected = detail;
        this.cambioEstado = detail.estado === 'PENDIENTE' ? 'EN_REVISION' : detail.estado;
        this.cantidadAjuste = Number(detail.diferencia ?? 0);
      },
      error: () => {},
    });
  }

  guardarBitacora() {
    if (!this.selected || !this.bitacoraTexto.trim()) return;
    this.saving = true;
    this.api
      .agregarBitacora(this.selected.id, { descripcion: this.bitacoraTexto.trim() })
      .subscribe({
        next: () => {
          this.bitacoraTexto = '';
          this.verDetalle(this.selected!.id);
        },
        error: (err: any) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar la bitácora.');
        },
        complete: () => (this.saving = false),
      });
  }

  actualizarEstado() {
    if (!this.selected) return;
    this.saving = true;
    this.api
      .cambiarEstado(this.selected.id, {
        estado: this.cambioEstado,
        descripcion: `Estado actualizado a ${this.cambioEstado}`,
      })
      .subscribe({
        next: (detail: InconsistenciaDetalle) => {
          this.selected = detail;
          this.cargar();
        },
        error: (err: any) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo cambiar estado.');
        },
        complete: () => (this.saving = false),
      });
  }

  resolverConAjuste() {
    if (!this.selected) return;
    if (!this.motivoAjuste.trim()) {
      this.errorMsg = 'Debes indicar motivo del ajuste.';
      return;
    }
    this.saving = true;
    this.api
      .resolverConAjuste(this.selected.id, {
        cantidadAjuste: this.cantidadAjuste,
        motivo: this.motivoAjuste.trim(),
        categoria: this.selected.incidencia.tipo,
        descripcion: `Ajuste por inconsistencia #${this.selected.id}`,
      })
      .subscribe({
        next: (detail: InconsistenciaDetalle) => {
          this.selected = detail;
          this.motivoAjuste = '';
          this.cargar();
        },
        error: (err: any) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo resolver con ajuste.');
        },
        complete: () => (this.saving = false),
      });
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value ?? 0);
  }
}

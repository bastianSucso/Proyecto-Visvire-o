import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Producto, ProductosService } from '../../../../../core/services/productos.service';
import {
  InconsistenciaCategoria,
  InconsistenciaContexto,
  InconsistenciaDetalle,
  InconsistenciaEstado,
  InconsistenciaListItem,
  InconsistenciaSesionActiva,
  InconsistenciasAdminService,
} from '../../../../../core/services/inconsistencias-admin.service';
import { Ubicacion, UbicacionesService } from '../../../../../core/services/ubicaciones.service';
import { InventarioService } from '../../../../../core/services/inventario.service';

@Component({
  selector: 'app-inconsistencias-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inconsistencias-admin.page.html',
})
export class InconsistenciasAdminPage implements OnInit {
  private readonly api = inject(InconsistenciasAdminService);
  private readonly productosService = inject(ProductosService);
  private readonly ubicacionesService = inject(UbicacionesService);
  private readonly inventarioService = inject(InventarioService);

  loading = false;
  saving = false;
  errorMsg = '';

  estadoFiltro: InconsistenciaEstado | '' = '';
  fechaFiltro = '';
  modalNuevaOpen = false;

  items: InconsistenciaListItem[] = [];
  selected: InconsistenciaDetalle | null = null;
  productos: Producto[] = [];
  ubicaciones: Ubicacion[] = [];

  contextoNuevo: InconsistenciaContexto = 'DURANTE_JORNADA';
  sesionActivaModal: InconsistenciaSesionActiva | null = null;
  ubicacionNueva = '';
  tipoNuevo: InconsistenciaCategoria = 'FALTANTE';
  cantidadNueva = 1;
  observacionNueva = '';

  scan = '';
  sugerencias: Producto[] = [];
  showSug = false;
  activeSugIndex = -1;
  productoNuevo: Producto | null = null;
  stockTeoricoProductoSeleccionado: number | null = null;
  loadingStockTeorico = false;

  stockRealResolucion = 0;
  motivoResolucion = '';

  ngOnInit(): void {
    this.productosService.list(true).subscribe({
      next: (rows) => {
        this.productos = rows ?? [];
      },
      error: () => {},
    });

    this.ubicacionesService.list(undefined, false).subscribe({
      next: (rows) => {
        this.ubicaciones = rows ?? [];
      },
      error: () => {},
    });

    this.cargar();
  }

  onFiltersChange() {
    this.cargar();
  }

  getEstado(item: InconsistenciaListItem | InconsistenciaDetalle): InconsistenciaEstado {
    return (item.resolucionAdmin?.estadoFinal ?? 'PENDIENTE') as InconsistenciaEstado;
  }

  private norm(s: string) {
    return (s || '').trim().toLowerCase();
  }

  private isComida(producto: Producto) {
    return producto.tipo === 'COMIDA';
  }

  getTipoBadgeClass(producto: Producto) {
    const tipo = producto.tipo ?? '';
    if (tipo === 'INSUMO') return 'bg-blue-50 text-blue-700 ring-blue-200';
    if (tipo === 'REVENTA') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (tipo === 'COMIDA') return 'bg-amber-50 text-amber-700 ring-amber-200';
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  private closeSug() {
    this.sugerencias = [];
    this.showSug = false;
    this.activeSugIndex = -1;
  }

  openNuevaModal() {
    this.modalNuevaOpen = true;
    this.errorMsg = '';
    this.contextoNuevo = 'FUERA_JORNADA';
    this.sesionActivaModal = null;
    this.ubicacionNueva = '';
    this.tipoNuevo = 'FALTANTE';
    this.cantidadNueva = 1;
    this.observacionNueva = '';
    this.scan = '';
    this.productoNuevo = null;
    this.stockTeoricoProductoSeleccionado = null;
    this.loadingStockTeorico = false;
    this.closeSug();

    this.api.sesionActiva().subscribe({
      next: (sesion) => {
        this.sesionActivaModal = sesion;
        this.contextoNuevo = sesion ? 'DURANTE_JORNADA' : 'FUERA_JORNADA';
      },
      error: () => {
        this.sesionActivaModal = null;
        this.contextoNuevo = 'FUERA_JORNADA';
      },
    });
  }

  closeNuevaModal() {
    this.modalNuevaOpen = false;
  }

  onUbicacionNuevaChange() {
    this.actualizarStockTeoricoProductoSeleccionado();
  }

  onScanChange(value: string) {
    this.scan = value;
    const q = this.norm(value);
    if (!q) {
      this.closeSug();
      return;
    }

    const matches = this.productos
      .filter((p) => {
        if (p.tipo === 'COMIDA') return false;
        const name = this.norm(p.name);
        const code = this.norm(p.internalCode);
        const barcode = this.norm(p.barcode || '');
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);

    this.sugerencias = matches;
    this.showSug = matches.length > 0;
    this.activeSugIndex = this.showSug ? 0 : -1;
  }

  onScanKeydown(ev: KeyboardEvent) {
    if (!this.showSug || this.sugerencias.length === 0) {
      if (ev.key === 'Escape') this.closeSug();
      return;
    }

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.activeSugIndex = Math.min(this.activeSugIndex + 1, this.sugerencias.length - 1);
      return;
    }

    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.activeSugIndex = Math.max(this.activeSugIndex - 1, 0);
      return;
    }

    if (ev.key === 'Enter') {
      ev.preventDefault();
      const idx = this.activeSugIndex >= 0 ? this.activeSugIndex : 0;
      const p = this.sugerencias[idx];
      if (p) this.seleccionarSug(p);
      return;
    }

    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.closeSug();
    }
  }

  onScanEnter() {
    if (this.sugerencias.length > 0) {
      this.seleccionarSug(this.sugerencias[0]);
    }
  }

  seleccionarSug(p: Producto) {
    if (this.isComida(p)) {
      this.errorMsg =
        'No se puede registrar inconsistencia para productos tipo COMIDA desde este flujo.';
      return;
    }

    this.errorMsg = '';
    this.productoNuevo = p;
    this.scan = `${p.name} · ${p.internalCode}`;
    this.closeSug();
    this.actualizarStockTeoricoProductoSeleccionado();
  }

  private actualizarStockTeoricoProductoSeleccionado() {
    if (!this.productoNuevo || !this.ubicacionNueva) {
      this.stockTeoricoProductoSeleccionado = null;
      return;
    }

    this.loadingStockTeorico = true;
    this.inventarioService.listarStock().subscribe({
      next: (rows) => {
        const producto = (rows ?? []).find((it) => it.id === this.productoNuevo?.id);
        if (!producto) {
          this.stockTeoricoProductoSeleccionado = 0;
          return;
        }
        const stockUbicacion = producto.stocks.find((s) => s.ubicacion.id === this.ubicacionNueva);
        this.stockTeoricoProductoSeleccionado = Number(stockUbicacion?.cantidad ?? 0);
      },
      error: () => {
        this.stockTeoricoProductoSeleccionado = null;
      },
      complete: () => {
        this.loadingStockTeorico = false;
      },
    });
  }

  crearInconsistencia() {
    if (!this.productoNuevo) {
      this.errorMsg = 'Debes seleccionar un producto desde el buscador.';
      return;
    }
    if (!this.observacionNueva.trim()) {
      this.errorMsg = 'Debes indicar una observación.';
      return;
    }
    if (!this.ubicacionNueva) {
      this.errorMsg = 'Debes seleccionar una ubicación.';
      return;
    }
    if (this.isComida(this.productoNuevo)) {
      this.errorMsg =
        'No se puede registrar inconsistencia para productos tipo COMIDA desde este flujo.';
      return;
    }
    this.saving = true;
    this.api
      .crear({
        contexto: this.contextoNuevo,
        productoId: this.productoNuevo.id,
        ubicacionId: this.ubicacionNueva,
        tipo: this.tipoNuevo,
        cantidad: this.cantidadNueva,
        observacion: this.observacionNueva.trim(),
      })
      .subscribe({
        next: (detail: InconsistenciaDetalle) => {
          this.selected = detail;
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
          const newSelection = this.items.find((it) => it.id === selectedId) ?? this.items[0];
          this.verDetalle(newSelection.id);
        },
        error: (err: any) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg)
            ? msg.join(' | ')
            : (msg ?? 'No se pudo cargar inconsistencias.');
        },
        complete: () => (this.loading = false),
      });
  }

  verDetalle(id: number) {
    this.api.detalle(id).subscribe({
      next: (detail: InconsistenciaDetalle) => {
        this.selected = detail;
        this.stockRealResolucion = Number(detail.resolucionAdmin?.stockRealObservado ?? 0);
        this.motivoResolucion = detail.resolucionAdmin?.motivoResolucion ?? '';
      },
      error: () => {},
    });
  }

  resolver() {
    if (!this.selected) return;
    if (this.selected.resolucionAdmin) {
      this.errorMsg = 'La inconsistencia ya fue resuelta.';
      return;
    }
    if (!this.motivoResolucion.trim()) {
      this.errorMsg = 'Debes indicar motivo de resolución.';
      return;
    }
    this.saving = true;
    this.api
      .resolver(this.selected.id, {
        stockRealObservado: this.stockRealResolucion,
        motivoResolucion: this.motivoResolucion.trim(),
      })
      .subscribe({
        next: (detail: InconsistenciaDetalle) => {
          this.selected = detail;
          this.cargar();
        },
        error: (err: any) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg)
            ? msg.join(' | ')
            : (msg ?? 'No se pudo resolver la inconsistencia.');
        },
        complete: () => (this.saving = false),
      });
  }
}

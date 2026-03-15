import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  InventarioSalaObjetivo,
  InventarioSalaObjetivosService,
} from '../../../../../core/services/inventario-sala-objetivos.service';
import { Producto, ProductosService } from '../../../../../core/services/productos.service';

@Component({
  selector: 'app-inventario-sala-objetivos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './inventario-sala-objetivos.page.html',
})
export class InventarioSalaObjetivosPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventarioSalaObjetivosService);
  private readonly productosService = inject(ProductosService);
  private readonly router = inject(Router);

  objetivos: InventarioSalaObjetivo[] = [];
  productos: Producto[] = [];

  loading = false;
  errorMsg = '';

  q = '';
  page = 1;
  pageSize = 20;
  readonly pageSizes = [10, 20, 50, 100];

  isModalOpen = false;
  editing: InventarioSalaObjetivo | null = null;
  selectedProducto: Producto | null = null;

  productoSearch = '';
  sugerencias: Producto[] = [];
  showSug = false;
  activeSugIndex = -1;

  form = this.fb.group({
    stockIdeal: [1, [Validators.required, Validators.min(0.001)]],
  });

  ngOnInit() {
    this.loadProductos();
    this.loadObjetivos();
  }

  loadObjetivos() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list().subscribe({
      next: (data) => {
        this.objetivos = data ?? [];
        this.page = 1;
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  loadProductos() {
    this.productosService.list(false).subscribe({
      next: (data) => (this.productos = data ?? []),
      error: () => {
        this.productos = [];
      },
    });
  }

  onSearchChange() {
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  private normalize(value: unknown) {
    return String(value ?? '').trim().toLowerCase();
  }

  private isComida(producto: Producto) {
    return producto.tipo === 'COMIDA';
  }

  private closeSug() {
    this.sugerencias = [];
    this.showSug = false;
    this.activeSugIndex = -1;
  }

  get filtered(): InventarioSalaObjetivo[] {
    const term = this.normalize(this.q);
    if (!term) return this.objetivos;

    return this.objetivos.filter((o) => {
      const p = o.producto;
      return (
        this.normalize(p.name).includes(term) ||
        this.normalize(p.internalCode).includes(term) ||
        this.normalize(p.barcode || '').includes(term)
      );
    });
  }

  get totalItems() {
    return this.filtered.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems() {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get fromItem() {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toItem() {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  first() {
    this.page = 1;
  }

  prev() {
    this.page = Math.max(1, this.page - 1);
  }

  next() {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  last() {
    this.page = this.totalPages;
  }

  openCreate() {
    this.errorMsg = '';
    this.editing = null;
    this.selectedProducto = null;
    this.isModalOpen = true;
    this.productoSearch = '';
    this.closeSug();
    this.form.reset({ stockIdeal: 1 });
    this.form.enable();
  }

  openEdit(item: InventarioSalaObjetivo) {
    this.errorMsg = '';
    this.editing = item;
    this.selectedProducto = null;
    this.isModalOpen = true;
    this.productoSearch = `${item.producto.name} · ${item.producto.internalCode}`;
    this.closeSug();
    this.form.reset({ stockIdeal: item.stockIdeal });
    this.form.enable();
  }

  closeModal() {
    this.isModalOpen = false;
    this.editing = null;
    this.selectedProducto = null;
    this.productoSearch = '';
    this.closeSug();
  }

  onProductoSearchChange(value: string) {
    this.productoSearch = value;

    if (this.editing) return;

    const q = this.normalize(value);
    if (!q) {
      this.closeSug();
      return;
    }

    const objetivoProductoIds = new Set(this.objetivos.map((o) => o.producto.id));
    const matches = this.productos
      .filter((p) => {
        if (!p.isActive) return false;
        if (this.isComida(p)) return false;
        if (objetivoProductoIds.has(p.id)) return false;

        return (
          this.normalize(p.name).includes(q) ||
          this.normalize(p.internalCode).includes(q) ||
          this.normalize(p.barcode || '').includes(q)
        );
      })
      .slice(0, 8);

    this.sugerencias = matches;
    this.showSug = matches.length > 0;
    this.activeSugIndex = this.showSug ? 0 : -1;
  }

  onProductoKeydown(ev: KeyboardEvent) {
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
      if (p) this.selectProducto(p);
      return;
    }

    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.closeSug();
    }
  }

  selectProducto(p: Producto) {
    this.selectedProducto = p;
    this.productoSearch = `${p.name} · ${p.internalCode}${p.barcode ? ' · ' + p.barcode : ''}`;
    this.closeSug();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const stockIdeal = Number(this.form.value.stockIdeal ?? 0);
    if (!Number.isFinite(stockIdeal) || stockIdeal <= 0) {
      this.errorMsg = 'El stock ideal debe ser mayor a 0.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    if (this.editing) {
      this.api.update(this.editing.id, { stockIdeal }).subscribe({
        next: () => {
          this.closeModal();
          this.loadObjetivos();
        },
        error: (err) => {
          this.errorMsg = this.mapError(err);
          this.loading = false;
        },
        complete: () => (this.loading = false),
      });
      return;
    }

    if (!this.selectedProducto) {
      this.errorMsg = 'Selecciona un producto para configurar su stock ideal.';
      this.loading = false;
      return;
    }

    this.api
      .create({ productoId: this.selectedProducto.id, stockIdeal })
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadObjetivos();
        },
        error: (err) => {
          this.errorMsg = this.mapError(err);
          this.loading = false;
        },
        complete: () => (this.loading = false),
      });
  }

  remove(item: InventarioSalaObjetivo) {
    const ok = confirm(
      `¿Quitar "${item.producto.name}" de productos importantes en sala? Esta acción es irreversible.`,
    );
    if (!ok) return;

    this.api.remove(item.id).subscribe({
      next: () => this.loadObjetivos(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  irARellenar(item: InventarioSalaObjetivo) {
    const cantidad = Number(item.faltante ?? 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) return;

    this.router.navigate(['/admin/inventario/traspasos'], {
      queryParams: {
        productoId: item.producto.id,
        cantidad: this.toCantidadInput(cantidad),
        prefillDestinoSala: '1',
      },
    });
  }

  getTipoBadgeClass(tipo: string | null | undefined) {
    if (tipo === 'INSUMO') return 'bg-blue-50 text-blue-700 ring-blue-200';
    if (tipo === 'REVENTA') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  private toCantidadInput(value: number) {
    return Number(value.toFixed(3));
  }

  c(name: string) {
    return this.form.get(name);
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;

    if (status === 409) return 'El producto ya tiene stock ideal configurado.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    if (status === 404) return 'No hay sala de ventas activa configurada.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}

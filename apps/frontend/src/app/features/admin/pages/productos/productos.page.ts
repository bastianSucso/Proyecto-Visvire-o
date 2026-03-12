import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosService, Producto, ProductoTipo } from '../../../../core/services/productos.service';

@Component({
  selector: 'app-productos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: 'productos.page.html',
})
export class ProductosPage {
  private fb = inject(FormBuilder);
  private productosService = inject(ProductosService);

  productos: Producto[] = [];
  loading = false;
  errorMsg = '';

  // UX tabla (como POS)
  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];
  tipoFilter: 'ALL' | 'INSUMO' | 'REVENTA' = 'ALL';
  sortBy: 'precioCosto' | 'precioVenta' | 'ganancia' | null = null;
  sortDir: 'asc' | 'desc' = 'desc';

  isModalOpen = false;
  editing: Producto | null = null;

  readonly tiposOptions: ProductoTipo[] = ['REVENTA', 'INSUMO'];
  readonly unidadBaseOptions = ['g', 'kg', 'ml', 'l', 'unidad', 'pack'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    internalCode: ['', [Validators.required, Validators.maxLength(60)]],
    barcode: [''],
    unidadBase: ['', [Validators.required]],
    precioCosto: [0, [Validators.required, Validators.min(0)]],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
    tipo: ['', [Validators.required]],
  });

  ngOnInit() {
    this.load();
    this.form.get('tipo')?.valueChanges.subscribe(() => this.applyTipoRules());
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.productosService.list(true).subscribe({
      next: (data) => {
        const all = data ?? [];
        this.productos = all.filter((p) => p.tipo !== 'COMIDA');
        this.page = 1; // reset al refrescar
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
      complete: () => (this.loading = false),
    });
  }

  // ------- helpers tabla ----------
  onSearchChange() {
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  onTipoFilterChange() {
    this.page = 1;
  }

  toggleSort(column: 'precioCosto' | 'precioVenta' | 'ganancia') {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.sortBy = column;
      this.sortDir = 'desc';
    }
    this.page = 1;
  }

  sortIcon(column: 'precioCosto' | 'precioVenta' | 'ganancia') {
    if (this.sortBy !== column) return '';
    return this.sortDir === 'desc' ? '▼' : '▲';
  }

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  get filtered(): Producto[] {
    const term = this.normalize(this.q);
    let items = this.productos;

    if (this.tipoFilter !== 'ALL') {
      items = items.filter((p) => p.tipo === this.tipoFilter);
    }

    if (term) {
      items = items.filter((p) => {
        const hay = [
          p.name,
          p.internalCode,
          p.barcode,
          p.unidadBase,
        ].map((x) => this.normalize(x)).join(' | ');

        return hay.includes(term);
      });
    }

    if (!this.sortBy) return items;

    return [...items].sort((a, b) => {
      const costoA = Number(a.precioCosto ?? 0);
      const costoB = Number(b.precioCosto ?? 0);
      const ventaA = Number(a.precioVenta ?? 0);
      const ventaB = Number(b.precioVenta ?? 0);

      let valueA = 0;
      let valueB = 0;

      if (this.sortBy === 'precioCosto') {
        valueA = costoA;
        valueB = costoB;
      } else if (this.sortBy === 'precioVenta') {
        valueA = ventaA;
        valueB = ventaB;
      } else {
        valueA = a.tipo === 'INSUMO' ? 0 : ventaA - costoA;
        valueB = b.tipo === 'INSUMO' ? 0 : ventaB - costoB;
      }

      if (valueA === valueB) return 0;
      const result = valueA < valueB ? -1 : 1;
      return this.sortDir === 'asc' ? result : -result;
    });
  }

  get totalItems() {
    return this.filtered.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): Producto[] {
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

  first() { this.page = 1; }
  prev() { this.page = Math.max(1, this.page - 1); }
  next() { this.page = Math.min(this.totalPages, this.page + 1); }
  last() { this.page = this.totalPages; }

  // ------- modal ----------
  openCreate() {
    this.errorMsg = '';
    this.editing = null;
    this.isModalOpen = true;

    this.form.reset({
      name: '',
      internalCode: '',
      barcode: '',
      unidadBase: '',
      precioCosto: 0,
      precioVenta: 0,
      tipo: '',
    });

    this.form.enable();
    this.applyTipoRules();
    this.form.get('unidadBase')?.enable({ emitEvent: false });

    this.productosService.suggestInternalCode().subscribe({
      next: (res) => {
        const ctrl = this.form.get('internalCode');
        if (ctrl && !ctrl.value) ctrl.setValue(res.internalCode);
      },
      error: () => {
      },
    });
  }

  openEdit(p: Producto) {
    this.errorMsg = '';
    this.editing = p;
    this.isModalOpen = true;
    this.form.reset({
      name: p.name,
      internalCode: p.internalCode,
      barcode: p.barcode ?? '',
      unidadBase: p.unidadBase ?? '',
      precioCosto: Number(p.precioCosto),
      precioVenta: Number(p.precioVenta),
      tipo: p.tipo,
    });
    this.form.enable();
    this.applyTipoRules();
    this.form.get('precioCosto')?.disable({ emitEvent: false });
    this.form.get('unidadBase')?.disable({ emitEvent: false });
  }

  closeModal() {
    this.isModalOpen = false;
    this.editing = null;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const tipo = (v.tipo ?? '') as ProductoTipo;
    if (!tipo) {
      this.errorMsg = 'Debe seleccionar un tipo de producto.';
      this.form.get('tipo')?.setErrors({ required: true });
      return;
    }

    const createPayload = {
      name: (v.name ?? '').trim(),
      internalCode: (v.internalCode ?? '').trim(),
      barcode: (v.barcode ?? '').trim() || undefined,
      unidadBase: (v.unidadBase ?? '').trim(),
      precioVenta: tipo === 'INSUMO' ? 0 : Number(v.precioVenta ?? 0),
      tipo,
    };

    const updatePayload = {
      name: createPayload.name,
      internalCode: createPayload.internalCode,
      barcode: createPayload.barcode,
      precioVenta: createPayload.precioVenta,
      tipo: createPayload.tipo,
    };

    this.loading = true;
    this.errorMsg = '';

    const req$ = this.editing
      ? this.productosService.update(this.editing.id, updatePayload)
      : this.productosService.create({
          ...createPayload,
          precioCosto: Number(v.precioCosto ?? 0),
        });

    req$.subscribe({
      next: () => {
        this.closeModal();
        this.load();
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
      complete: () => (this.loading = false),
    });
  }

  toggleActive(p: Producto) {
    this.productosService.setActive(p.id, !p.isActive).subscribe({
      next: () => this.load(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  remove(p: Producto) {
    const ok = confirm(`¿Eliminar producto "${p.name}"? Esta acción es irreversible.`);
    if (!ok) return;

    this.productosService.remove(p.id).subscribe({
      next: () => this.load(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  c(name: string) {
    return this.form.get(name);
  }

  private applyTipoRules() {
    const tipo = this.getSelectedTipo();
    const precioVentaCtrl = this.form.get('precioVenta');
    if (!precioVentaCtrl) return;

    if (tipo === 'INSUMO') {
      precioVentaCtrl.setValue(0, { emitEvent: false });
      precioVentaCtrl.disable({ emitEvent: false });
    } else {
      precioVentaCtrl.enable({ emitEvent: false });
    }
  }

  private getSelectedTipo(): ProductoTipo | null {
    const value = (this.form.get('tipo')?.value ?? null) as ProductoTipo | null;
    return value || null;
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;

    if (status === 409) return 'Código interno o código de barra ya existe.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}

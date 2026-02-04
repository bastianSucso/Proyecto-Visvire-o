import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosService, Producto, ProductoTipo } from '../../../../core/services/productos.service';
import { RecetasService } from '../../../../core/services/recetas.service';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-preparaciones-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: 'preparaciones.page.html',
})
export class PreparacionesPage {
  private fb = inject(FormBuilder);
  private productosService = inject(ProductosService);
  private recetasService = inject(RecetasService);

  productos: Producto[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';

  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  isModalOpen = false;
  editing: Producto | null = null;

  readonly unidadBaseOptions = ['g', 'kg', 'ml', 'l', 'unidad', 'pack'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    internalCode: ['', [Validators.required, Validators.maxLength(60)]],
    barcode: [''],
    unidadBase: [''],
    precioCosto: [0, [Validators.required, Validators.min(0)]],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.productosService.list(true).subscribe({
      next: (data) => {
        const all = data ?? [];
        this.productos = all.filter((p) => (p.tipos ?? []).includes('COMIDA'));
        this.page = 1;
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
      complete: () => (this.loading = false),
    });
  }

  onSearchChange() {
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  get filtered(): Producto[] {
    const term = this.normalize(this.q);
    if (!term) return this.productos;

    return this.productos.filter((p) => {
      const hay = [p.name, p.internalCode, p.barcode, p.unidadBase]
        .map((x) => this.normalize(x))
        .join(' | ');

      return hay.includes(term);
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
    this.successMsg = '';
    this.editing = null;
    this.isModalOpen = true;

    this.form.reset({
      name: '',
      internalCode: '',
      barcode: '',
      unidadBase: '',
      precioCosto: 0,
      precioVenta: 0,
    });

    this.form.enable();
    this.form.get('precioCosto')?.disable();

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
    this.successMsg = '';
    this.editing = p;
    this.isModalOpen = true;
    this.form.reset({
      name: p.name,
      internalCode: p.internalCode,
      barcode: p.barcode ?? '',
      unidadBase: p.unidadBase ?? '',
      precioCosto: Number(p.precioCosto),
      precioVenta: Number(p.precioVenta),
    });
    this.form.enable();
    this.form.get('precioCosto')?.disable();
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

    const payload = {
      name: (v.name ?? '').trim(),
      internalCode: (v.internalCode ?? '').trim(),
      barcode: (v.barcode ?? '').trim() || undefined,
      unidadBase: (v.unidadBase ?? '').trim() || undefined,
      precioVenta: Number(v.precioVenta ?? 0),
      tipos: ['COMIDA'] as ProductoTipo[],
    };

    this.loading = true;
    this.errorMsg = '';

    const req$ = this.editing
      ? this.productosService.update(this.editing.id, payload)
      : this.productosService.create({ ...payload, precioCosto: 0 });

    req$.subscribe({
      next: () => {
        this.successMsg = this.editing ? 'Preparación actualizada correctamente.' : 'Preparación creada correctamente.';
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
    const ok = confirm(`¿Eliminar preparación "${p.name}"? Esta acción es irreversible.`);
    if (!ok) return;

    this.productosService.remove(p.id).subscribe({
      next: () => {
        this.successMsg = 'Preparación eliminada correctamente.';
        this.load();
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  c(name: string) {
    return this.form.get(name);
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

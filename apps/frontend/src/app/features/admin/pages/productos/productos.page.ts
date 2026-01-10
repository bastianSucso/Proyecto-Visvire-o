import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosService, Producto } from '../../../../core/services/productos.service';

@Component({
  selector: 'app-productos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: 'productos.page.html',
})
export class ProductosPage {
  private fb = inject(FormBuilder);
  private productosService = inject(ProductosService);

  productos: Producto[] = [];
  loading = false;
  errorMsg = '';

  isModalOpen = false;
  editing: Producto | null = null;

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
      next: (data) => (this.productos = data),
      error: (err) => (this.errorMsg = this.mapError(err)),
      complete: () => (this.loading = false),
    });
  }

  openCreate() {
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
  }

  openEdit(p: Producto) {
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
      precioCosto: Number(v.precioCosto ?? 0),
      precioVenta: Number(v.precioVenta ?? 0),
    };

    this.loading = true;
    this.errorMsg = '';

    const req$ = this.editing
      ? this.productosService.update(this.editing.id, payload)
      : this.productosService.create(payload);

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

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  InventarioService,
  InventarioStockItem,
} from '../../../../../core/services/inventario.service';
import { Ubicacion, UbicacionesService } from '../../../../../core/services/ubicaciones.service';

@Component({
  selector: 'app-inventario-ajuste-operativo-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './inventario-ajuste-operativo.page.html',
})
export class InventarioAjusteOperativoPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly inventarioService = inject(InventarioService);
  private readonly ubicacionesService = inject(UbicacionesService);
  private readonly router = inject(Router);

  form = this.fb.group({
    productoId: ['', Validators.required],
    ubicacionId: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0.001)]],
    observacion: ['', Validators.maxLength(220)],
  });

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  stock: InventarioStockItem[] = [];
  ubicaciones: Ubicacion[] = [];

  scan = '';
  sugerencias: InventarioStockItem[] = [];
  showSug = false;
  activeSugIndex = -1;
  productoSeleccionado: InventarioStockItem | null = null;
  stockUbicacionActual: number | null = null;

  ngOnInit() {
    this.loadData();
    this.form.controls.ubicacionId.valueChanges.subscribe(() => this.actualizarStockUbicacionActual());
  }

  get ubicacionesOrdenadas() {
    return [...this.ubicaciones].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private normalize(value: string | null | undefined) {
    return (value ?? '').trim().toLowerCase();
  }

  private closeSug() {
    this.sugerencias = [];
    this.showSug = false;
    this.activeSugIndex = -1;
  }

  loadData() {
    this.loading = true;
    this.errorMsg = '';

    this.inventarioService.listarStock().subscribe({
      next: (rows) => {
        this.stock = rows ?? [];
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
      },
      complete: () => {
        this.loading = false;
      },
    });

    this.ubicacionesService.list(undefined, false).subscribe({
      next: (rows) => {
        this.ubicaciones = rows ?? [];
      },
      error: () => {},
    });

  }

  onScanInput(value: string) {
    this.scan = value;
    const q = this.normalize(value);
    if (!q) {
      this.closeSug();
      return;
    }

    const matches = this.stock
      .filter((item) => {
        const name = this.normalize(item.name);
        const code = this.normalize(item.internalCode);
        const barcode = this.normalize(item.barcode);
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);

    this.sugerencias = matches;
    this.showSug = matches.length > 0;
    this.activeSugIndex = this.showSug ? 0 : -1;
  }

  onScanKeydown(event: KeyboardEvent) {
    if (!this.showSug || this.sugerencias.length === 0) {
      if (event.key === 'Escape') this.closeSug();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeSugIndex = Math.min(this.activeSugIndex + 1, this.sugerencias.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeSugIndex = Math.max(this.activeSugIndex - 1, 0);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const index = this.activeSugIndex >= 0 ? this.activeSugIndex : 0;
      const selected = this.sugerencias[index];
      if (selected) this.seleccionarProducto(selected);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSug();
    }
  }

  seleccionarProducto(item: InventarioStockItem) {
    this.productoSeleccionado = item;
    this.scan = `${item.name} · ${item.internalCode}`;
    this.form.patchValue({ productoId: item.id });
    this.closeSug();
    this.actualizarStockUbicacionActual();
  }

  limpiarProducto() {
    this.productoSeleccionado = null;
    this.scan = '';
    this.form.patchValue({ productoId: '' });
    this.stockUbicacionActual = null;
    this.closeSug();
  }

  actualizarStockUbicacionActual() {
    const ubicacionId = this.form.value.ubicacionId ?? '';
    if (!this.productoSeleccionado || !ubicacionId) {
      this.stockUbicacionActual = null;
      return;
    }

    const stockUbicacion = this.productoSeleccionado.stocks.find((s) => s.ubicacion.id === ubicacionId);
    this.stockUbicacionActual = Number(stockUbicacion?.cantidad ?? 0);
  }

  registrar() {
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.productoSeleccionado) {
      this.errorMsg = 'Debes seleccionar un producto desde el buscador.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const cantidad = Number(this.form.value.cantidad ?? 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.errorMsg = 'La cantidad debe ser mayor a 0.';
      return;
    }

    this.saving = true;

    this.inventarioService
      .registrarAjusteOperativo({
        productoId: this.productoSeleccionado.id,
        ubicacionId: String(this.form.value.ubicacionId ?? ''),
        cantidad,
        causa: 'USO_NEGOCIO',
        observacion: String(this.form.value.observacion ?? '').trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Ajuste operativo registrado correctamente.';
          this.form.patchValue({ cantidad: 1, observacion: '' });
          this.loadData();
          this.actualizarStockUbicacionActual();
        },
        error: (err) => {
          this.errorMsg = this.mapError(err);
        },
        complete: () => {
          this.saving = false;
        },
      });
  }

  volver() {
    this.router.navigate(['/admin/inventario']);
  }

  private mapError(err: any) {
    const status = err?.status;
    const message = err?.error?.message;
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    if (status === 404) return 'No se encontró el recurso solicitado.';
    if (status === 409) return 'No fue posible aplicar el ajuste por conflicto de estado.';
    return Array.isArray(message) ? message.join(' | ') : (message ?? 'Error inesperado');
  }
}

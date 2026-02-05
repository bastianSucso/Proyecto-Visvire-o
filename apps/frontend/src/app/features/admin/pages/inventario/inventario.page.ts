import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { UbicacionesService, Ubicacion } from '../../../../core/services/ubicaciones.service';
import { InventarioService, InventarioStockItem } from '../../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: 'inventario.page.html',
})
export class InventarioPage {
  private fb = inject(FormBuilder);
  private productosService = inject(ProductosService);
  private ubicacionesService = inject(UbicacionesService);
  private inventarioService = inject(InventarioService);

  productos: Producto[] = [];
  ubicaciones: Ubicacion[] = [];

  stock: InventarioStockItem[] = [];
  stockPage = 1;
  stockPageSize = 20;
  readonly stockPageSizes = [10, 20, 50, 100];

  loadingStock = false;
  loadingForm = false;

  errorMsg = '';
  stockMsg = '';
  stockError = '';

  qStock = '';

  ajusteModalOpen = false;
  ajusteSearch = '';
  ajusteSugerencias: Producto[] = [];
  ajusteShowSug = false;
  ajusteActiveIndex = -1;

  ajusteForm = this.fb.group({
    productoId: ['', [Validators.required]],
    ubicacionId: ['', [Validators.required]],
    cantidad: [0, [Validators.required]],
    motivo: ['', [Validators.required, Validators.maxLength(300)]],
  });


  ngOnInit() {
    this.loadCatalogs();
    this.loadStock();
  }

  loadCatalogs() {
    this.productosService.list(true).subscribe({
      next: (data) => (this.productos = data ?? []),
      error: () => {},
    });

    this.ubicacionesService.list(undefined, false).subscribe({
      next: (data) => (this.ubicaciones = data ?? []),
      error: () => {},
    });
  }

  loadStock() {
    this.loadingStock = true;
    this.stockError = '';
    this.inventarioService.listarStock(this.qStock).subscribe({
      next: (data) => {
        this.stock = data ?? [];
        this.stockPage = 1;
      },
      error: (err) => {
        this.stockError = this.mapError(err);
      },
      complete: () => (this.loadingStock = false),
    });
  }

  get ubicacionesOrdenadas() {
    return [...this.ubicaciones].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  onStockSearchChange() {
    this.stockPage = 1;
    this.loadStock();
  }

  onStockPageSizeChange() {
    this.stockPage = 1;
  }

  get stockTotalItems() {
    return this.stock.length;
  }

  get stockTotalPages() {
    return Math.max(1, Math.ceil(this.stockTotalItems / this.stockPageSize));
  }

  get stockPageItems(): InventarioStockItem[] {
    const start = (this.stockPage - 1) * this.stockPageSize;
    return this.stock.slice(start, start + this.stockPageSize);
  }

  get stockFromItem() {
    if (this.stockTotalItems === 0) return 0;
    return (this.stockPage - 1) * this.stockPageSize + 1;
  }

  get stockToItem() {
    return Math.min(this.stockPage * this.stockPageSize, this.stockTotalItems);
  }

  stockFirst() { this.stockPage = 1; }
  stockPrev() { this.stockPage = Math.max(1, this.stockPage - 1); }
  stockNext() { this.stockPage = Math.min(this.stockTotalPages, this.stockPage + 1); }
  stockLast() { this.stockPage = this.stockTotalPages; }

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  openAjusteModal() {
    this.ajusteModalOpen = true;
    this.ajusteSearch = '';
    this.ajusteSugerencias = [];
    this.ajusteShowSug = false;
    this.ajusteActiveIndex = -1;
    this.ajusteForm.reset({
      productoId: '',
      ubicacionId: '',
      cantidad: 0,
      motivo: '',
    });
  }

  closeAjusteModal() {
    this.ajusteModalOpen = false;
  }


  onAjusteSearchChange(value: string) {
    this.ajusteSearch = value;
    const q = this.normalize(value);
    if (!q) {
      this.ajusteSugerencias = [];
      this.ajusteShowSug = false;
      this.ajusteActiveIndex = -1;
      return;
    }

    const matches = this.productos
      .filter((p) => {
        const name = this.normalize(p.name);
        const code = this.normalize(p.internalCode);
        const barcode = this.normalize(p.barcode || '');
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);

    this.ajusteSugerencias = matches;
    this.ajusteShowSug = matches.length > 0;
    this.ajusteActiveIndex = this.ajusteShowSug ? 0 : -1;
  }

  onAjusteKeydown(ev: KeyboardEvent) {
    if (!this.ajusteShowSug || this.ajusteSugerencias.length === 0) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.ajusteActiveIndex = this.clampIndex(
        this.ajusteActiveIndex + 1,
        this.ajusteSugerencias.length,
      );
      return;
    }

    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.ajusteActiveIndex = this.clampIndex(
        this.ajusteActiveIndex - 1,
        this.ajusteSugerencias.length,
      );
      return;
    }

    if (ev.key === 'Enter') {
      ev.preventDefault();
      const idx = this.ajusteActiveIndex >= 0 ? this.ajusteActiveIndex : 0;
      const p = this.ajusteSugerencias[idx];
      if (p) this.seleccionarAjuste(p);
      return;
    }

    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.ajusteSugerencias = [];
      this.ajusteShowSug = false;
      this.ajusteActiveIndex = -1;
    }
  }

  seleccionarAjuste(p: Producto) {
    this.ajusteForm.patchValue({ productoId: p.id });
    this.ajusteSearch = `${p.name} · ${p.internalCode}${p.barcode ? ' · ' + p.barcode : ''}`;
    this.ajusteSugerencias = [];
    this.ajusteShowSug = false;
    this.ajusteActiveIndex = -1;
  }

  private clampIndex(i: number, len: number) {
    if (len <= 0) return -1;
    return Math.max(0, Math.min(i, len - 1));
  }

  get selectedAjusteProducto() {
    const id = this.ajusteForm.get('productoId')?.value || '';
    return this.productos.find((p) => p.id === id) || null;
  }


  registrarAjuste() {
    this.stockMsg = '';
    this.errorMsg = '';

    if (this.ajusteForm.invalid) {
      this.ajusteForm.markAllAsTouched();
      return;
    }

    const v = this.ajusteForm.value;
    const cantidad = Number(v.cantidad);

    if (!Number.isInteger(cantidad) || cantidad === 0) {
      this.errorMsg = 'La cantidad debe ser un entero distinto de 0.';
      return;
    }

    const payload = {
      productoId: String(v.productoId),
      ubicacionId: String(v.ubicacionId),
      cantidad,
      motivo: String(v.motivo ?? '').trim(),
    };

    this.loadingForm = true;

    this.inventarioService.registrarAjuste(payload).subscribe({
      next: () => {
        this.stockMsg = 'Ajuste registrado correctamente.';
        this.closeAjusteModal();
        this.loadStock();
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
      },
      complete: () => (this.loadingForm = false),
    });
  }


  getStockFor(producto: InventarioStockItem, ubicacionId: string) {
    const row = producto.stocks.find((s) => s.ubicacion.id === ubicacionId);
    return row?.cantidad ?? 0;
  }

  cAjuste(name: string) {
    return this.ajusteForm.get(name);
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;

    if (status === 409) return 'Conflicto con el estado del inventario.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}

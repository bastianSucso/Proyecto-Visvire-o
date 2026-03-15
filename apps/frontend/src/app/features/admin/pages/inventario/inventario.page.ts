import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InventarioService, InventarioStockItem } from '../../../../core/services/inventario.service';
import { InventarioHojaCompraService } from '../../../../core/services/inventario-hoja-compra.service';
import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { Ubicacion, UbicacionesService } from '../../../../core/services/ubicaciones.service';

@Component({
  selector: 'app-inventario-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: 'inventario.page.html',
})
export class InventarioPage {
  private readonly fb = inject(FormBuilder);
  private readonly productosService = inject(ProductosService);
  private readonly ubicacionesService = inject(UbicacionesService);
  private readonly inventarioService = inject(InventarioService);
  private readonly hojaCompraService = inject(InventarioHojaCompraService);

  productos: Producto[] = [];
  ubicaciones: Ubicacion[] = [];

  stock: InventarioStockItem[] = [];
  stockPage = 1;
  stockPageSize = 20;
  readonly stockPageSizes = [10, 20, 50, 100];
  stockSortBy: 'cantidadTotal' | `ubicacion:${string}` | null = null;
  stockSortDir: 'asc' | 'desc' = 'desc';

  loadingStock = false;
  stockError = '';
  qStock = '';

  isAddCompraModalOpen = false;
  addCompraError = '';
  savingAddCompra = false;
  selectedStockProducto: InventarioStockItem | null = null;

  addCompraForm = this.fb.group({
    cantidad: [1, [Validators.required, Validators.min(0.001)]],
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
    return this.sortedStock.slice(start, start + this.stockPageSize);
  }

  get sortedStock(): InventarioStockItem[] {
    if (!this.stockSortBy) return this.stock;

    return [...this.stock].sort((a, b) => {
      const valueA = this.stockValueForSort(a, this.stockSortBy!);
      const valueB = this.stockValueForSort(b, this.stockSortBy!);
      if (valueA === valueB) return 0;
      const result = valueA < valueB ? -1 : 1;
      return this.stockSortDir === 'asc' ? result : -result;
    });
  }

  get stockFromItem() {
    if (this.stockTotalItems === 0) return 0;
    return (this.stockPage - 1) * this.stockPageSize + 1;
  }

  get stockToItem() {
    return Math.min(this.stockPage * this.stockPageSize, this.stockTotalItems);
  }

  stockFirst() {
    this.stockPage = 1;
  }

  stockPrev() {
    this.stockPage = Math.max(1, this.stockPage - 1);
  }

  stockNext() {
    this.stockPage = Math.min(this.stockTotalPages, this.stockPage + 1);
  }

  stockLast() {
    this.stockPage = this.stockTotalPages;
  }

  getStockFor(producto: InventarioStockItem, ubicacionId: string) {
    const row = producto.stocks.find((s) => s.ubicacion.id === ubicacionId);
    return row?.cantidad ?? 0;
  }

  toggleStockSortTotal() {
    this.toggleStockSort('cantidadTotal');
  }

  toggleStockSortUbicacion(ubicacionId: string) {
    this.toggleStockSort(`ubicacion:${ubicacionId}`);
  }

  stockSortIconTotal() {
    return this.stockSortIcon('cantidadTotal');
  }

  stockSortIconUbicacion(ubicacionId: string) {
    return this.stockSortIcon(`ubicacion:${ubicacionId}`);
  }

  private toggleStockSort(column: 'cantidadTotal' | `ubicacion:${string}`) {
    if (this.stockSortBy === column) {
      this.stockSortDir = this.stockSortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.stockSortBy = column;
      this.stockSortDir = 'desc';
    }
    this.stockPage = 1;
  }

  private stockSortIcon(column: 'cantidadTotal' | `ubicacion:${string}`) {
    if (this.stockSortBy !== column) return '';
    return this.stockSortDir === 'desc' ? '▼' : '▲';
  }

  private stockValueForSort(item: InventarioStockItem, column: 'cantidadTotal' | `ubicacion:${string}`) {
    if (column === 'cantidadTotal') return Number(item.cantidadTotal ?? 0);
    const ubicacionId = column.replace('ubicacion:', '');
    return this.getStockFor(item, ubicacionId);
  }

  openAddCompraModal(item: InventarioStockItem) {
    this.selectedStockProducto = item;
    this.addCompraError = '';
    this.savingAddCompra = false;
    this.addCompraForm.reset({ cantidad: 1 });
    this.isAddCompraModalOpen = true;
  }

  closeAddCompraModal() {
    this.isAddCompraModalOpen = false;
    this.selectedStockProducto = null;
    this.addCompraError = '';
    this.savingAddCompra = false;
  }

  saveAddCompra() {
    if (!this.selectedStockProducto) return;

    if (this.addCompraForm.invalid) {
      this.addCompraForm.markAllAsTouched();
      return;
    }

    const cantidad = Number(this.addCompraForm.value.cantidad ?? 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.addCompraError = 'La cantidad debe ser mayor a 0.';
      return;
    }

    this.savingAddCompra = true;
    this.addCompraError = '';
    this.hojaCompraService
      .addHojaCompraItem({ productoId: this.selectedStockProducto.id, cantidad })
      .subscribe({
        next: () => {
          this.closeAddCompraModal();
          this.loadStock();
        },
        error: (err) => {
          this.addCompraError = this.mapError(err);
          this.savingAddCompra = false;
        },
      });
  }

  c(name: string) {
    return this.addCompraForm.get(name);
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

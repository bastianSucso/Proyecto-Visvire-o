import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InventarioService, InventarioStockItem } from '../../../../core/services/inventario.service';
import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { Ubicacion, UbicacionesService } from '../../../../core/services/ubicaciones.service';

@Component({
  selector: 'app-inventario-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: 'inventario.page.html',
})
export class InventarioPage {
  private readonly productosService = inject(ProductosService);
  private readonly ubicacionesService = inject(UbicacionesService);
  private readonly inventarioService = inject(InventarioService);

  productos: Producto[] = [];
  ubicaciones: Ubicacion[] = [];

  stock: InventarioStockItem[] = [];
  stockPage = 1;
  stockPageSize = 20;
  readonly stockPageSizes = [10, 20, 50, 100];

  loadingStock = false;
  stockError = '';
  qStock = '';

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

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  HojaCompraItem,
  InventarioHojaCompraService,
  ProductoImportanteCompra,
} from '../../../../../core/services/inventario-hoja-compra.service';
import { Producto, ProductosService } from '../../../../../core/services/productos.service';

@Component({
  selector: 'app-inventario-hoja-compra-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './inventario-hoja-compra.page.html',
})
export class InventarioHojaCompraPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventarioHojaCompraService);
  private readonly productosService = inject(ProductosService);

  items: HojaCompraItem[] = [];
  productos: Producto[] = [];
  loading = false;
  errorMsg = '';
  q = '';

  page = 1;
  pageSize = 20;
  readonly pageSizes = [10, 20, 50, 100];

  draftCantidadById: Record<string, number> = {};
  private readonly autosaveTimers: Record<string, number> = {};
  private readonly resaveAfterCurrent: Record<string, boolean> = {};
  private readonly savingById: Record<string, boolean> = {};

  isImportantesModalOpen = false;
  importantes: ProductoImportanteCompra[] = [];
  importantesLoading = false;
  importantesError = '';
  importantesQ = '';
  importantesPage = 1;
  importantesPageSize = 10;
  readonly importantesPageSizes = [10, 20, 50, 100];

  importantesEditing: ProductoImportanteCompra | null = null;
  selectedProducto: Producto | null = null;
  productoSearch = '';
  sugerencias: Producto[] = [];
  showSug = false;
  activeSugIndex = -1;

  importanteForm = this.fb.group({
    cantidadMinima: [1, [Validators.required, Validators.min(0.001)]],
  });

  ngOnInit() {
    this.loadProductos();
    this.loadItems();
  }

  loadProductos() {
    this.productosService.list(false).subscribe({
      next: (data) => (this.productos = data ?? []),
      error: () => {
        this.productos = [];
      },
    });
  }

  loadItems() {
    this.loading = true;
    this.errorMsg = '';
    this.api.listHojaCompra().subscribe({
      next: (data) => {
        this.items = data ?? [];
        this.page = 1;
        this.syncDrafts();
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  onSearchChange() {
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  onImportantesPageSizeChange() {
    this.importantesPage = 1;
  }

  onImportantesSearchChange() {
    this.importantesPage = 1;
  }

  private normalize(value: unknown) {
    return String(value ?? '').trim().toLowerCase();
  }

  private syncDrafts() {
    this.draftCantidadById = {};
    for (const item of this.items) {
      this.draftCantidadById[item.id] = Number(item.cantidad ?? 0);
    }
  }

  get filtered() {
    const term = this.normalize(this.q);
    if (!term) return this.items;

    return this.items.filter((item) => {
      const p = item.producto;
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

  get pageItems(): HojaCompraItem[] {
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

  get totalEstimado() {
    return this.filtered.reduce((sum, item) => sum + Number(item.subtotalEstimado ?? 0), 0);
  }

  first() {
    this.page = 1;
  }

  importantesFirst() {
    this.importantesPage = 1;
  }

  importantesPrev() {
    this.importantesPage = Math.max(1, this.importantesPage - 1);
  }

  importantesNext() {
    this.importantesPage = Math.min(this.importantesTotalPages, this.importantesPage + 1);
  }

  importantesLast() {
    this.importantesPage = this.importantesTotalPages;
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

  onCantidadInputChange(item: HojaCompraItem) {
    this.scheduleAutosave(item.id);
  }

  onCantidadBlur(item: HojaCompraItem) {
    this.flushAutosave(item.id);
  }

  private scheduleAutosave(itemId: string) {
    const existingTimer = this.autosaveTimers[itemId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    this.autosaveTimers[itemId] = window.setTimeout(() => {
      delete this.autosaveTimers[itemId];
      this.saveCantidadById(itemId);
    }, 500);
  }

  private flushAutosave(itemId: string) {
    const existingTimer = this.autosaveTimers[itemId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete this.autosaveTimers[itemId];
    }
    this.saveCantidadById(itemId);
  }

  private saveCantidadById(itemId: string) {
    const item = this.items.find((row) => row.id === itemId);
    if (!item) return;

    if (this.savingById[itemId]) {
      this.resaveAfterCurrent[itemId] = true;
      return;
    }

    const cantidad = Number(this.draftCantidadById[item.id] ?? 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.errorMsg = 'La cantidad debe ser mayor a 0.';
      return;
    }

    const current = Number(item.cantidad ?? 0);
    if (Math.abs(cantidad - current) < 0.0005) {
      return;
    }

    this.savingById[itemId] = true;
    this.errorMsg = '';
    this.api.updateHojaCompraItem(item.id, { cantidad }).subscribe({
      next: (updated) => {
        this.items = this.items.map((row) => (row.id === updated.id ? updated : row));
        this.draftCantidadById[updated.id] = updated.cantidad;
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
      },
      complete: () => {
        this.savingById[itemId] = false;
        if (this.resaveAfterCurrent[itemId]) {
          this.resaveAfterCurrent[itemId] = false;
          this.saveCantidadById(itemId);
        }
      },
    });
  }

  openImportantesModal() {
    this.isImportantesModalOpen = true;
    this.importantesError = '';
    this.importantesEditing = null;
    this.selectedProducto = null;
    this.productoSearch = '';
    this.closeSug();
    this.importanteForm.reset({ cantidadMinima: 1 });
    this.loadImportantes();
  }

  closeImportantesModal() {
    this.isImportantesModalOpen = false;
    this.importantesError = '';
    this.importantesEditing = null;
    this.selectedProducto = null;
    this.productoSearch = '';
    this.closeSug();
  }

  loadImportantes() {
    this.importantesLoading = true;
    this.importantesError = '';
    this.api.listProductosImportantes().subscribe({
      next: (data) => {
        this.importantes = data ?? [];
        this.importantesPage = 1;
      },
      error: (err) => {
        this.importantesError = this.mapError(err);
      },
      complete: () => {
        this.importantesLoading = false;
      },
    });
  }

  openCreateImportante() {
    this.importantesError = '';
    this.importantesEditing = null;
    this.selectedProducto = null;
    this.productoSearch = '';
    this.closeSug();
    this.importanteForm.reset({ cantidadMinima: 1 });
    this.importanteForm.enable();
  }

  openEditImportante(item: ProductoImportanteCompra) {
    this.importantesError = '';
    this.importantesEditing = item;
    this.selectedProducto = null;
    this.productoSearch = `${item.producto.name} · ${item.producto.internalCode}`;
    this.closeSug();
    this.importanteForm.reset({ cantidadMinima: item.cantidadMinima });
    this.importanteForm.enable();
  }

  saveImportante() {
    if (this.importanteForm.invalid) {
      this.importanteForm.markAllAsTouched();
      return;
    }

    const cantidadMinima = Number(this.importanteForm.value.cantidadMinima ?? 0);
    if (!Number.isFinite(cantidadMinima) || cantidadMinima <= 0) {
      this.importantesError = 'La cantidad mínima debe ser mayor a 0.';
      return;
    }

    this.importantesLoading = true;
    this.importantesError = '';

    if (this.importantesEditing) {
      this.api.updateProductoImportante(this.importantesEditing.id, { cantidadMinima }).subscribe({
        next: () => {
          this.importantesEditing = null;
          this.selectedProducto = null;
          this.productoSearch = '';
          this.closeSug();
          this.importanteForm.reset({ cantidadMinima: 1 });
          this.loadImportantes();
          this.loadItems();
        },
        error: (err) => {
          this.importantesError = this.mapError(err);
          this.importantesLoading = false;
        },
      });
      return;
    }

    if (!this.selectedProducto) {
      this.importantesError = 'Selecciona un producto para configurar su cantidad mínima.';
      this.importantesLoading = false;
      return;
    }

    this.api.createProductoImportante({ productoId: this.selectedProducto.id, cantidadMinima }).subscribe({
      next: () => {
        this.selectedProducto = null;
        this.productoSearch = '';
        this.closeSug();
        this.importanteForm.reset({ cantidadMinima: 1 });
        this.loadImportantes();
        this.loadItems();
      },
      error: (err) => {
        this.importantesError = this.mapError(err);
        this.importantesLoading = false;
      },
    });
  }

  removeImportante(item: ProductoImportanteCompra) {
    const ok = confirm(
      `¿Quitar "${item.producto.name}" de productos importantes para compra? Esta acción es irreversible.`,
    );
    if (!ok) return;

    this.api.removeProductoImportante(item.id).subscribe({
      next: () => this.loadImportantes(),
      error: (err) => (this.importantesError = this.mapError(err)),
    });
  }

  onProductoSearchChange(value: string) {
    this.productoSearch = value;
    if (this.importantesEditing) return;

    const term = this.normalize(value);
    if (!term) {
      this.closeSug();
      return;
    }

    const importanteIds = new Set(this.importantes.map((item) => item.producto.id));
    const matches = this.productos
      .filter((p) => {
        if (!p.isActive) return false;
        if (p.tipo === 'COMIDA') return false;
        if (importanteIds.has(p.id)) return false;

        return (
          this.normalize(p.name).includes(term) ||
          this.normalize(p.internalCode).includes(term) ||
          this.normalize(p.barcode || '').includes(term)
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

  private closeSug() {
    this.sugerencias = [];
    this.showSug = false;
    this.activeSugIndex = -1;
  }

  get importantesFiltered() {
    const term = this.normalize(this.importantesQ);
    if (!term) return this.importantes;

    return this.importantes.filter((item) => {
      const p = item.producto;
      return (
        this.normalize(p.name).includes(term) ||
        this.normalize(p.internalCode).includes(term) ||
        this.normalize(p.barcode || '').includes(term)
      );
    });
  }

  get importantesTotalItems() {
    return this.importantesFiltered.length;
  }

  get importantesTotalPages() {
    return Math.max(1, Math.ceil(this.importantesTotalItems / this.importantesPageSize));
  }

  get importantesPageItems() {
    const start = (this.importantesPage - 1) * this.importantesPageSize;
    return this.importantesFiltered.slice(start, start + this.importantesPageSize);
  }

  get importantesFromItem() {
    if (this.importantesTotalItems === 0) return 0;
    return (this.importantesPage - 1) * this.importantesPageSize + 1;
  }

  get importantesToItem() {
    return Math.min(this.importantesPage * this.importantesPageSize, this.importantesTotalItems);
  }

  getTipoBadgeClass(tipo: string | null | undefined) {
    if (tipo === 'INSUMO') return 'bg-blue-50 text-blue-700 ring-blue-200';
    if (tipo === 'REVENTA') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  importanteControl(name: string) {
    return this.importanteForm.get(name);
  }

  remove(item: HojaCompraItem) {
    const ok = confirm(`¿Quitar "${item.producto.name}" de la hoja de compra?`);
    if (!ok) return;

    this.api.removeHojaCompraItem(item.id).subscribe({
      next: () => this.loadItems(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  limpiarCompra() {
    const ok = confirm(
      'Se eliminarán todos los productos de la hoja y se cargarán solo los importantes con faltante. ¿Deseas continuar?',
    );
    if (!ok) return;

    this.loading = true;
    this.errorMsg = '';
    this.api.limpiarHojaCompra().subscribe({
      next: (data) => {
        this.items = data ?? [];
        this.page = 1;
        this.syncDrafts();
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
      },
      complete: () => (this.loading = false),
    });
  }

  exportPdfPaginaVisible() {
    const rows = this.pageItems;
    if (rows.length === 0) {
      this.errorMsg = 'No hay productos en la pagina visible para exportar.';
      return;
    }

    this.errorMsg = '';

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const now = new Date();
    const fechaEmision = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const numberFmt = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const cantidadFmt = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
    const monedaFmt = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    const totalPagina = rows.reduce((sum, item) => sum + Number(item.subtotalEstimado ?? 0), 0);
    const itemsCount = rows.length;
    const yHeaderTop = 36;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(30, yHeaderTop - 16, 535, 78, 10, 10, 'F');

    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Hoja de compra', 40, yHeaderTop);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha de emision: ${fechaEmision}`, 40, yHeaderTop + 20);
    doc.text(`Pagina visual exportada: ${this.page} de ${this.totalPages}`, 40, yHeaderTop + 35);

    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(370, yHeaderTop - 8, 185, 58, 8, 8, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 64, 175);
    doc.text(`Items: ${numberFmt.format(itemsCount)}`, 382, yHeaderTop + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Total hoja: ${monedaFmt.format(totalPagina)}`, 382, yHeaderTop + 30);

    doc.setDrawColor(226, 232, 240);
    doc.line(30, yHeaderTop + 72, 565, yHeaderTop + 72);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    autoTable(doc, {
      startY: yHeaderTop + 86,
      head: [['Producto', 'Codigo', 'Unidad', 'Precio costo', 'Cantidad a comprar', 'Subtotal']],
      body: rows.map((item) => [
        item.producto.name,
        item.producto.internalCode,
        item.producto.unidadBase ?? '-',
        monedaFmt.format(Number(item.precioCostoUnitario ?? 0)),
        cantidadFmt.format(Number(item.cantidad ?? 0)),
        monedaFmt.format(Number(item.subtotalEstimado ?? 0)),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [29, 78, 216],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 150 },
        1: { cellWidth: 95 },
        2: { cellWidth: 60 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      margin: { left: 30, right: 30, bottom: 42 },
      theme: 'grid',
    });

    const autoTableState = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
    const finalY = autoTableState.lastAutoTable?.finalY ?? yHeaderTop + 86;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(345, finalY + 10, 220, 26, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total hoja de compra: ${monedaFmt.format(totalPagina)}`, 355, finalY + 27);

    const totalPdfPages = doc.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= totalPdfPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Documento generado desde sistema', 30, 822);
      doc.text(`Pagina ${pageNumber} de ${totalPdfPages}`, 565, 822, { align: 'right' });
    }

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    doc.save(`hoja-compra-pagina-${this.page}-${yyyy}-${mm}-${dd}.pdf`);
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;

    if (status === 409) return 'Conflicto con el estado actual de la hoja de compra.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    if (status === 404) return 'No se encontró el registro solicitado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}

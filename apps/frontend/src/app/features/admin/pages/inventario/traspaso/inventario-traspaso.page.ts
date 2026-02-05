import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductosService, Producto } from '../../../../../core/services/productos.service';
import { UbicacionesService, Ubicacion } from '../../../../../core/services/ubicaciones.service';
import { InventarioService, InventarioStockItem } from '../../../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-traspaso-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inventario-traspaso.page.html',
})
export class InventarioTraspasoPage {
  @ViewChild('scanInput') scanInput?: ElementRef<HTMLInputElement>;

  private productosService = inject(ProductosService);
  private ubicacionesService = inject(UbicacionesService);
  private inventarioService = inject(InventarioService);
  private router = inject(Router);

  productos: Producto[] = [];
  ubicaciones: Ubicacion[] = [];
  stockItems: InventarioStockItem[] = [];
  stockOrigenByProducto: Record<string, number> = {};
  loadingStock = false;

  items: {
    id: string;
    name: string;
    internalCode: string;
    barcode: string | null;
    unidadBase: string | null;
    cantidad: number;
  }[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';

  origenId = '';
  destinoId = '';

  scan = '';
  sugerencias: Producto[] = [];
  showSug = false;
  activeSugIndex = -1;
  scanError = '';

  cantidadRapida = 1;
  editCantidad: Record<string, number> = {};
  savingItemId: number | null = null;

  ngOnInit() {
    this.cargarProductos();
    this.cargarUbicaciones();
    this.cargarStock();
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

  private isBarcodeLike(s: string) {
    const t = (s || '').trim();
    return /^[0-9]{8,14}$/.test(t);
  }

  private closeSug() {
    this.sugerencias = [];
    this.showSug = false;
    this.activeSugIndex = -1;
  }

  cargarProductos() {
    this.productosService.list(true).subscribe({
      next: (data) => (this.productos = data ?? []),
      error: () => {},
    });
  }

  cargarUbicaciones() {
    this.ubicacionesService.list(undefined, false).subscribe({
      next: (data) => (this.ubicaciones = data ?? []),
      error: () => {},
    });
  }

  cargarStock() {
    this.loadingStock = true;
    this.inventarioService.listarStock().subscribe({
      next: (data) => {
        this.stockItems = data ?? [];
        this.refreshStockOrigen();
      },
      error: () => {
        this.stockItems = [];
        this.stockOrigenByProducto = {};
      },
      complete: () => (this.loadingStock = false),
    });
  }

  private refreshStockOrigen() {
    if (!this.origenId) {
      this.stockOrigenByProducto = {};
      return;
    }

    const map: Record<string, number> = {};
    for (const p of this.stockItems) {
      const row = p.stocks.find((s) => s.ubicacion.id === this.origenId);
      map[p.id] = row?.cantidad ?? 0;
    }
    this.stockOrigenByProducto = map;
  }

  getStockOrigen(productoId: string) {
    if (!this.origenId) return null;
    return this.stockOrigenByProducto[productoId] ?? 0;
  }

  onHeaderChange() {
    if (this.origenId === this.destinoId) {
      this.errorMsg = 'Origen y destino no pueden ser iguales.';
      return;
    }
    this.errorMsg = '';
    this.refreshStockOrigen();
  }

  onScanChange(value: string) {
    this.scan = value;
    this.scanError = '';

    const q = this.norm(value);
    if (!q) {
      this.closeSug();
      return;
    }

    const matches = this.productos
      .filter((p) => {
        if (this.isComida(p)) return false;
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

  async onScanEnter() {
    this.scanError = '';

    const raw = (this.scan || '').trim();
    if (!raw) return;

    const cant = Number(this.cantidadRapida);
    if (!Number.isInteger(cant) || cant < 1) {
      this.scanError = 'Cantidad inválida (debe ser entero >= 1).';
      return;
    }

    if (this.isBarcodeLike(raw)) {
      const hit =
        this.productos.find((p) => (p.barcode || '').trim() === raw) ||
        this.productos.find((p) => (p.internalCode || '').trim() === raw);

      if (hit) {
        if (this.isComida(hit)) {
          this.scanError = 'No se permite traspasar productos COMIDA.';
          return;
        }
        await this.addByProducto(hit, cant);
        return;
      }
    }

    if (this.sugerencias.length > 0) {
      await this.addByProducto(this.sugerencias[0], cant);
      return;
    }

    this.scanError = 'Sin coincidencias para agregar.';
  }

  async seleccionarSug(p: Producto) {
    if (this.isComida(p)) {
      this.scanError = 'No se permite traspasar productos COMIDA.';
      return;
    }
    const cant = Number(this.cantidadRapida);
    if (!Number.isInteger(cant) || cant < 1) {
      this.scanError = 'Cantidad inválida (debe ser entero >= 1).';
      return;
    }

    await this.addByProducto(p, cant);
  }

  private async addByProducto(producto: Producto, cantidad: number) {
    if (this.savingItemId !== null) return;
    if (this.isComida(producto)) {
      this.scanError = 'No se permite traspasar productos COMIDA.';
      return;
    }

    const existing = this.items.find((it) => it.id === producto.id);
    if (!existing) {
      this.items = [
        ...this.items,
        {
          id: producto.id,
          name: producto.name,
          internalCode: producto.internalCode,
          barcode: producto.barcode ?? null,
          unidadBase: producto.unidadBase ?? null,
          cantidad,
        },
      ];
      this.editCantidad[producto.id] = cantidad;
    } else {
      existing.cantidad += cantidad;
      this.editCantidad[producto.id] = existing.cantidad;
    }

    this.scan = '';
    this.cantidadRapida = 1;
    this.closeSug();
  }

  guardarCantidad(itemId: string) {
    const cantidad = Number(this.editCantidad[itemId]);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      this.scanError = 'La cantidad debe ser un entero mayor o igual a 1.';
      return;
    }

    const item = this.items.find((it) => it.id === itemId);
    if (item) item.cantidad = cantidad;
  }

  eliminarItem(itemId: string) {
    this.items = this.items.filter((it) => it.id !== itemId);
  }

  confirmar() {
    if (!this.origenId || !this.destinoId) {
      this.errorMsg = 'Selecciona origen y destino.';
      return;
    }
    if (this.origenId === this.destinoId) {
      this.errorMsg = 'Origen y destino no pueden ser iguales.';
      return;
    }
    if (this.items.length === 0) {
      this.errorMsg = 'Debes agregar al menos un producto.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const payload = {
      origenId: this.origenId,
      destinoId: this.destinoId,
      items: this.items.map((it) => ({ productoId: it.id, cantidad: it.cantidad })),
    };

    this.inventarioService.crearDocumentoTraspaso(payload).subscribe({
      next: (doc) => {
        this.successMsg = 'Traspaso confirmado correctamente.';
        this.router.navigate(['/admin/inventario/documentos', doc.documentoRef]);
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'No se pudo confirmar.';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  volver() {
    this.router.navigate(['/admin/inventario']);
  }
}

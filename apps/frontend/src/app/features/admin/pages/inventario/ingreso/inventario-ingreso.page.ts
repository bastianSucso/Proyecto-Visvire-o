import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductosService, Producto } from '../../../../../core/services/productos.service';
import { UbicacionesService, Ubicacion } from '../../../../../core/services/ubicaciones.service';
import { InventarioService } from '../../../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-ingreso-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inventario-ingreso.page.html',
})
export class InventarioIngresoPage {
  @ViewChild('scanInput') scanInput?: ElementRef<HTMLInputElement>;

  private productosService = inject(ProductosService);
  private ubicacionesService = inject(UbicacionesService);
  private inventarioService = inject(InventarioService);
  private router = inject(Router);

  productos: Producto[] = [];
  ubicaciones: Ubicacion[] = [];

  items: {
    id: string;
    name: string;
    internalCode: string;
    barcode: string | null;
    unidadBase: string | null;
    cantidad: number;
    costoIngreso: number;
  }[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';

  destinoId = '';

  scan = '';
  sugerencias: Producto[] = [];
  showSug = false;
  activeSugIndex = -1;
  scanError = '';

  cantidadRapida = 1;
  editCantidad: Record<string, number> = {};
  editCosto: Record<string, number> = {};


  ngOnInit() {
    this.cargarProductos();
    this.cargarUbicaciones();
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

  get destinoSeleccionado() {
    return this.ubicaciones.find((u) => u.id === this.destinoId) || null;
  }

  get isDestinoSala() {
    return this.destinoSeleccionado?.tipo === 'SALA_VENTA';
  }

  onDestinoChange() {
    this.scanError = '';
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
    if (!Number.isFinite(cant) || cant <= 0) {
      this.scanError = 'Cantidad inválida (debe ser > 0).';
      return;
    }

    if (this.isBarcodeLike(raw)) {
      const hit =
        this.productos.find((p) => (p.barcode || '').trim() === raw) ||
        this.productos.find((p) => (p.internalCode || '').trim() === raw);

      if (hit) {
        if (this.isComida(hit)) {
          this.scanError = 'No se permite ingresar productos COMIDA.';
          return;
        }
        await this.addByProducto(hit, cant);
        return;
      }

      try {
        const res = await new Promise<Producto | null>((resolve) => {
          this.productosService.lookupByBarcode(raw).subscribe({
            next: (data) => resolve(data),
            error: () => resolve(null),
          });
        });
        if (res) {
          if (this.isComida(res)) {
            this.scanError = 'No se permite ingresar productos COMIDA.';
            return;
          }
          await this.addByProducto(res, cant);
          return;
        }
      } catch {
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
      this.scanError = 'No se permite ingresar productos COMIDA.';
      return;
    }
    const cant = Number(this.cantidadRapida);
    if (!Number.isFinite(cant) || cant <= 0) {
      this.scanError = 'Cantidad inválida (debe ser > 0).';
      return;
    }

    await this.addByProducto(p, cant);
  }

  private async addByProducto(producto: Producto, cantidad: number) {
    if (this.isComida(producto)) {
      this.scanError = 'No se permite ingresar productos COMIDA.';
      return;
    }
    const costoBase = Number(producto.precioCosto ?? 0);
    const costoIngreso = Number.isFinite(costoBase) ? costoBase : 0;
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
          costoIngreso,
        },
      ];
      this.editCantidad[producto.id] = cantidad;
      this.editCosto[producto.id] = costoIngreso;
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
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.scanError = 'La cantidad debe ser mayor a 0.';
      return;
    }

    const item = this.items.find((it) => it.id === itemId);
    if (item) item.cantidad = cantidad;
  }

  guardarCosto(itemId: string) {
    const costo = Number(this.editCosto[itemId]);
    if (!Number.isFinite(costo) || costo <= 0) {
      this.scanError = 'El costo debe ser mayor a 0.';
      return;
    }

    const item = this.items.find((it) => it.id === itemId);
    if (item) item.costoIngreso = costo;
  }

  eliminarItem(itemId: string) {
    this.items = this.items.filter((it) => it.id !== itemId);
  }

  confirmar() {
    if (!this.destinoId) {
      this.errorMsg = 'Selecciona un destino.';
      return;
    }
    if (this.items.length === 0) {
      this.errorMsg = 'Debes agregar al menos un producto.';
      return;
    }

    const invalido = this.items.find(
      (it) => !Number.isFinite(Number(it.costoIngreso)) || Number(it.costoIngreso) <= 0,
    );
    if (invalido) {
      this.errorMsg = 'Cada item debe tener un costo válido (> 0).';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const payload = {
      destinoId: this.destinoId,
      items: this.items.map((it) => ({
        productoId: it.id,
        cantidad: it.cantidad,
        costoIngreso: it.costoIngreso,
      })),
    };

    this.inventarioService.crearDocumentoIngreso(payload).subscribe({
      next: (doc) => {
        this.successMsg = 'Ingreso confirmado correctamente.';
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

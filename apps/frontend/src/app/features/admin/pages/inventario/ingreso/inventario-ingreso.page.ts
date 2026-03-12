import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InventarioService } from '../../../../../core/services/inventario.service';
import { Producto, ProductosService } from '../../../../../core/services/productos.service';
import { Ubicacion, UbicacionesService } from '../../../../../core/services/ubicaciones.service';

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
    costoBase: number;
    aplicaCreditoFiscal: boolean;
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
  editCostoText: Record<string, string> = {};
  editAplicaCredito: Record<string, boolean> = {};

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

  private parseClp(raw: string | number) {
    const onlyDigits = String(raw ?? '').replace(/\D/g, '');
    if (!onlyDigits) return 0;
    const parsed = Number(onlyDigits);
    if (!Number.isFinite(parsed)) return 0;
    return Math.trunc(parsed);
  }

  formatClp(value: number) {
    const amount = Math.max(0, Math.trunc(Number(value ?? 0)));
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getTipoBadgeClass(producto: Producto) {
    const tipo = producto.tipo ?? '';
    if (tipo === 'INSUMO') return 'bg-blue-50 text-blue-700 ring-blue-200';
    if (tipo === 'REVENTA') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (tipo === 'COMIDA') return 'bg-amber-50 text-amber-700 ring-amber-200';
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  getCostoWarningLevel(item: { costoIngreso: number; costoBase: number }) {
    const base = Number(item.costoBase ?? 0);
    const ingreso = Number(item.costoIngreso ?? 0);
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(ingreso) || ingreso <= 0) {
      return 'none';
    }

    const ratio = ingreso / base;
    if (ratio >= 10) return 'danger';
    if (ratio >= 3) return 'warn';
    return 'none';
  }

  hasCostoBase(item: { costoBase: number }) {
    const base = Number(item.costoBase ?? 0);
    return Number.isFinite(base) && base > 0;
  }

  getCostoWarningText(item: { costoIngreso: number; costoBase: number }) {
    const level = this.getCostoWarningLevel(item);
    if (level === 'danger') {
      return 'Costo muy alto vs costo habitual (>= 10x). Revisa antes de confirmar.';
    }
    if (level === 'warn') {
      return 'Costo alto vs costo habitual (>= 3x). Confirma si es correcto.';
    }
    return '';
  }

  get subtotalDocumento() {
    return this.items.reduce((sum, it) => sum + Number(it.cantidad) * Number(it.costoIngreso), 0);
  }

  subtotalItem(item: { cantidad: number; costoIngreso: number }) {
    return Number(item.cantidad) * Number(item.costoIngreso);
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

    const costoBaseRaw = Number(producto.precioCosto ?? 0);
    const costoBase =
      Number.isFinite(costoBaseRaw) && costoBaseRaw > 0 ? Math.trunc(costoBaseRaw) : 0;
    const costoIngreso = costoBase;
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
          costoBase,
          aplicaCreditoFiscal: false,
        },
      ];
      this.editCantidad[producto.id] = cantidad;
      this.editCosto[producto.id] = costoIngreso;
      this.editCostoText[producto.id] = this.formatClp(costoIngreso);
      this.editAplicaCredito[producto.id] = false;
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

  onCostoInput(itemId: string, value: string) {
    const parsed = this.parseClp(value);
    this.editCosto[itemId] = parsed;
    this.editCostoText[itemId] = parsed > 0 ? this.formatClp(parsed) : '';

    const item = this.items.find((it) => it.id === itemId);
    if (item) {
      item.costoIngreso = parsed;
    }
  }

  guardarCosto(itemId: string) {
    const item = this.items.find((it) => it.id === itemId);
    if (!item) return;

    const costo = this.parseClp(this.editCostoText[itemId]);
    if (!Number.isFinite(costo) || costo <= 0) {
      this.scanError = 'El costo debe ser mayor a 0.';
      this.editCostoText[itemId] = this.formatClp(item.costoIngreso);
      return;
    }

    this.editCosto[itemId] = costo;
    this.editCostoText[itemId] = this.formatClp(costo);
    item.costoIngreso = costo;
  }

  guardarAplicaCredito(itemId: string) {
    const item = this.items.find((it) => it.id === itemId);
    if (!item) return;
    item.aplicaCreditoFiscal = Boolean(this.editAplicaCredito[itemId]);
  }

  eliminarItem(itemId: string) {
    this.items = this.items.filter((it) => it.id !== itemId);
    delete this.editCantidad[itemId];
    delete this.editCosto[itemId];
    delete this.editCostoText[itemId];
    delete this.editAplicaCredito[itemId];
  }

  private validarFormulario() {
    if (!this.destinoId) {
      this.errorMsg = 'Selecciona un destino.';
      return false;
    }
    if (this.items.length === 0) {
      this.errorMsg = 'Debes agregar al menos un producto.';
      return false;
    }

    const invalido = this.items.find(
      (it) => !Number.isFinite(Number(it.costoIngreso)) || Number(it.costoIngreso) <= 0,
    );
    if (invalido) {
      this.errorMsg = 'Cada item debe tener un costo válido (> 0).';
      return false;
    }

    const invalidoCredito = this.items.find((it) => typeof it.aplicaCreditoFiscal !== 'boolean');
    if (invalidoCredito) {
      this.errorMsg = 'Cada item debe indicar si aplica crédito fiscal.';
      return false;
    }

    return true;
  }

  confirmar() {
    if (!this.validarFormulario()) return;

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const payload = {
      destinoId: this.destinoId,
      items: this.items.map((it) => ({
        productoId: it.id,
        cantidad: it.cantidad,
        costoIngreso: Math.trunc(it.costoIngreso),
        aplicaCreditoFiscal: it.aplicaCreditoFiscal,
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

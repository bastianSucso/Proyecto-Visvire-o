import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductosService, Producto } from '../../../../../core/services/productos.service';
import { UbicacionesService, Ubicacion } from '../../../../../core/services/ubicaciones.service';
import { InventarioService, InventarioStockItem } from '../../../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-conversion-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inventario-conversion.page.html',
})
export class InventarioConversionPage {
  private productosService = inject(ProductosService);
  private ubicacionesService = inject(UbicacionesService);
  private inventarioService = inject(InventarioService);
  private router = inject(Router);

  productos: Producto[] = [];
  ubicaciones: Ubicacion[] = [];
  stockItems: InventarioStockItem[] = [];
  stockByProducto: Record<string, number> = {};

  ubicacionId = '';

  origenSearch = '';
  destinoSearch = '';
  origenSugerencias: Producto[] = [];
  destinoSugerencias: Producto[] = [];
  origenShowSug = false;
  destinoShowSug = false;
  origenActiveIndex = -1;
  destinoActiveIndex = -1;

  origenSelected: Producto | null = null;
  destinoSelected: Producto | null = null;

  cantidadOrigen = 0;
  factor = 1;
  factorSource: 'direct' | 'inverse' | 'none' = 'none';

  loading = false;
  loadingFactor = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit() {
    this.loadCatalogs();
    this.loadStock();
  }

  private loadCatalogs() {
    this.productosService.list(true).subscribe({
      next: (data) => (this.productos = data ?? []),
      error: () => {},
    });

    this.ubicacionesService.list(undefined, false).subscribe({
      next: (data) => (this.ubicaciones = data ?? []),
      error: () => {},
    });
  }

  private loadStock() {
    this.inventarioService.listarStock().subscribe({
      next: (data) => {
        this.stockItems = data ?? [];
        this.refreshStockMap();
      },
      error: () => {
        this.stockItems = [];
        this.stockByProducto = {};
      },
    });
  }

  private refreshStockMap() {
    if (!this.ubicacionId) {
      this.stockByProducto = {};
      return;
    }

    const map: Record<string, number> = {};
    for (const p of this.stockItems) {
      const row = p.stocks.find((s) => s.ubicacion.id === this.ubicacionId);
      map[p.id] = row?.cantidad ?? 0;
    }
    this.stockByProducto = map;
  }

  onUbicacionChange() {
    this.refreshStockMap();
  }

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  private isComida(producto: Producto) {
    return producto.tipo === 'COMIDA';
  }

  private getSelectableProductos() {
    return this.productos.filter((p) => !this.isComida(p));
  }

  onOrigenSearchChange(value: string) {
    this.origenSearch = value;
    const q = this.normalize(value);
    if (!q) {
      this.origenSugerencias = [];
      this.origenShowSug = false;
      this.origenActiveIndex = -1;
      return;
    }

    const matches = this.getSelectableProductos()
      .filter((p) => {
        const name = this.normalize(p.name);
        const code = this.normalize(p.internalCode);
        const barcode = this.normalize(p.barcode || '');
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);

    this.origenSugerencias = matches;
    this.origenShowSug = matches.length > 0;
    this.origenActiveIndex = this.origenShowSug ? 0 : -1;
  }

  onDestinoSearchChange(value: string) {
    this.destinoSearch = value;
    const q = this.normalize(value);
    if (!q) {
      this.destinoSugerencias = [];
      this.destinoShowSug = false;
      this.destinoActiveIndex = -1;
      return;
    }

    const matches = this.getSelectableProductos()
      .filter((p) => {
        const name = this.normalize(p.name);
        const code = this.normalize(p.internalCode);
        const barcode = this.normalize(p.barcode || '');
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);

    this.destinoSugerencias = matches;
    this.destinoShowSug = matches.length > 0;
    this.destinoActiveIndex = this.destinoShowSug ? 0 : -1;
  }

  onOrigenKeydown(ev: KeyboardEvent) {
    if (!this.origenShowSug || this.origenSugerencias.length === 0) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.origenActiveIndex = Math.min(this.origenActiveIndex + 1, this.origenSugerencias.length - 1);
      return;
    }

    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.origenActiveIndex = Math.max(this.origenActiveIndex - 1, 0);
      return;
    }

    if (ev.key === 'Enter') {
      ev.preventDefault();
      const idx = this.origenActiveIndex >= 0 ? this.origenActiveIndex : 0;
      const p = this.origenSugerencias[idx];
      if (p) this.selectOrigen(p);
      return;
    }

    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.origenSugerencias = [];
      this.origenShowSug = false;
      this.origenActiveIndex = -1;
    }
  }

  onDestinoKeydown(ev: KeyboardEvent) {
    if (!this.destinoShowSug || this.destinoSugerencias.length === 0) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.destinoActiveIndex = Math.min(this.destinoActiveIndex + 1, this.destinoSugerencias.length - 1);
      return;
    }

    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.destinoActiveIndex = Math.max(this.destinoActiveIndex - 1, 0);
      return;
    }

    if (ev.key === 'Enter') {
      ev.preventDefault();
      const idx = this.destinoActiveIndex >= 0 ? this.destinoActiveIndex : 0;
      const p = this.destinoSugerencias[idx];
      if (p) this.selectDestino(p);
      return;
    }

    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.destinoSugerencias = [];
      this.destinoShowSug = false;
      this.destinoActiveIndex = -1;
    }
  }

  selectOrigen(p: Producto) {
    if (this.isComida(p)) {
      return;
    }
    this.origenSelected = p;
    this.origenSearch = `${p.name} · ${p.internalCode}${p.barcode ? ' · ' + p.barcode : ''}`;
    this.origenSugerencias = [];
    this.origenShowSug = false;
    this.origenActiveIndex = -1;
    this.fetchFactorSuggestion();
  }

  selectDestino(p: Producto) {
    if (this.isComida(p)) {
      return;
    }
    this.destinoSelected = p;
    this.destinoSearch = `${p.name} · ${p.internalCode}${p.barcode ? ' · ' + p.barcode : ''}`;
    this.destinoSugerencias = [];
    this.destinoShowSug = false;
    this.destinoActiveIndex = -1;
    this.fetchFactorSuggestion();
  }

  private fetchFactorSuggestion() {
    if (!this.origenSelected || !this.destinoSelected) return;

    this.loadingFactor = true;
    this.inventarioService.obtenerConversion(this.origenSelected.id, this.destinoSelected.id).subscribe({
      next: (res) => {
        this.factorSource = res.source;
        if (res.factor !== null && Number.isFinite(res.factor)) {
          this.factor = res.factor;
        } else {
          this.factor = 1;
        }
      },
      error: () => {
        this.factorSource = 'none';
      },
      complete: () => (this.loadingFactor = false),
    });
  }

  getStockFor(productoId: string) {
    if (!this.ubicacionId) return null;
    return this.stockByProducto[productoId] ?? 0;
  }

  get cantidadDestino() {
    const cant = Number(this.cantidadOrigen ?? 0);
    const factor = Number(this.factor ?? 0);
    if (!Number.isFinite(cant) || !Number.isFinite(factor)) return 0;
    return cant * factor;
  }

  get conversionTipo() {
    const origen = this.getTipoLabel(this.origenSelected);
    const destino = this.getTipoLabel(this.destinoSelected);
    if (!origen || !destino) return '---';
    return `${origen} → ${destino}`;
  }

  get ubicacionNombre() {
    return this.ubicaciones.find((u) => u.id === this.ubicacionId)?.nombre ?? '---';
  }

  private getTipoLabel(producto: Producto | null) {
    if (!producto) return null;
    return (producto.tipo ?? 'SIN TIPO').toUpperCase();
  }

  getTipoBadgeClass(producto: Producto | null) {
    const tipo = producto?.tipo ?? '';
    if (tipo === 'INSUMO') return 'bg-blue-50 text-blue-700 ring-blue-200';
    if (tipo === 'REVENTA') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  confirmarConversion() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.ubicacionId) {
      this.errorMsg = 'Selecciona una ubicación.';
      return;
    }
    if (!this.origenSelected || !this.destinoSelected) {
      this.errorMsg = 'Selecciona producto origen y destino.';
      return;
    }
    if (this.isComida(this.origenSelected) || this.isComida(this.destinoSelected)) {
      this.errorMsg = 'No se permite convertir productos tipo COMIDA.';
      return;
    }
    if (this.origenSelected.id === this.destinoSelected.id) {
      this.errorMsg = 'El producto origen y destino no pueden ser iguales.';
      return;
    }

    const cantidadOrigen = Number(this.cantidadOrigen ?? 0);
    const factor = Number(this.factor ?? 0);
    if (!Number.isFinite(cantidadOrigen) || cantidadOrigen <= 0) {
      this.errorMsg = 'La cantidad origen debe ser mayor a 0.';
      return;
    }
    if (!Number.isFinite(factor) || factor <= 0) {
      this.errorMsg = 'El factor debe ser mayor a 0.';
      return;
    }

    const stockOrigen = this.getStockFor(this.origenSelected.id) ?? 0;
    if (stockOrigen < cantidadOrigen) {
      this.errorMsg = 'Stock insuficiente en la ubicación seleccionada.';
      return;
    }

    this.loading = true;

    const payload = {
      productoOrigenId: this.origenSelected.id,
      productoDestinoId: this.destinoSelected.id,
      ubicacionId: this.ubicacionId,
      cantidadOrigen,
      factor,
    };

    this.inventarioService.convertirProducto(payload).subscribe({
      next: () => {
        this.successMsg = 'Conversión registrada correctamente.';
        this.inventarioService.guardarConversion({
          productoOrigenId: this.origenSelected!.id,
          productoDestinoId: this.destinoSelected!.id,
          factor,
        }).subscribe({
          next: () => {},
          error: () => {},
        });
        this.loadStock();
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'No se pudo completar la conversión.';
      },
      complete: () => (this.loading = false),
    });
  }

  volver() {
    this.router.navigate(['/admin/inventario']);
  }
}

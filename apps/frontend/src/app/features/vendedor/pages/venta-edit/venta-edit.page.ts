import { AfterViewChecked, AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  VentasService,
  VentaResponse,
  VentaItemResponse,
  MedioPago,
} from '../../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../../core/services/productos.service';

@Component({
  selector: 'app-venta-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './venta-edit.page.html',
})

export class VentaEditPage implements OnInit, AfterViewChecked  {
  @ViewChild('scanInput') scanInput?: ElementRef<HTMLInputElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ventasService = inject(VentasService);
  private productosService = inject(ProductosService);

  private didAutoFocus = false;

  idVenta!: number;

  venta: VentaResponse | null = null;
  loading = false;
  errorMsg = '';

  productos: Producto[] = [];
  productosLoading = false;
  productosError = '';


  // edición inline por item (cantidad)
  editCantidad: Record<number, number> = {};
  savingItemId: number | null = null;
  itemError = '';

  // Confirmar venta
  confirmando = false;
  confirmError = '';
  confirmMsg = '';

  // POS input (scanner/autocomplete)
  scan = '';
  sugerencias: Producto[] = [];
  showSug = false;
  scanError = '';

  // cantidad rápida (aplica al siguiente agregado)
  cantidadRapida = 1;
  activeSugIndex = -1;

  // HU-CJ-06: medio de pago (se elige al confirmar)
  medioPago: MedioPago | null = null;

  // Caja registradora (solo UI, no se persiste)
  montoRecibidoStr = ''; // input de texto para permitir “1234”, “1.234”, etc.
  montoRecibidoError = '';

  ngAfterViewChecked(): void {
    if (this.didAutoFocus) return;
    if (!this.enEdicion) return;

    const el = this.scanInput?.nativeElement;
    if (!el || el.disabled) return;

    requestAnimationFrame(() => {
      el.focus();
      el.select();
      this.didAutoFocus = true;
    });
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    this.idVenta = Number(raw);

    if (!this.idVenta || Number.isNaN(this.idVenta)) {
      this.errorMsg = 'ID de venta inválido.';
      return;
    }

    this.cargarVenta();
    this.cargarProductos();
  }

  // ---------- Helpers ----------
  private norm(s: string) {
    return (s || '').trim().toLowerCase();
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

  private parseCLP(input: string): number {
    // Acepta "12000", "12.000", "12,000", "12 000"
    const raw = (input ?? '').toString().trim();
    if (!raw) return 0;
    const normalized = raw.replace(/[^\d]/g, ''); // deja solo dígitos
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  private resetSugSelection() {
    this.activeSugIndex = this.sugerencias.length ? 0 : -1;
  }

  private clampSugIndex(i: number) {
    const max = this.sugerencias.length - 1;
    if (max < 0) return -1;
    return Math.max(0, Math.min(i, max));
  }

  private scrollActiveSuggestionIntoView() {
    // espera a que el DOM pinte el item activo
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-sug-active="true"]');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  // ---------- Computed ----------
  get enEdicion(): boolean {
    return this.venta?.estado === 'EN_EDICION';
  }

  private isVendible(p: Producto): boolean {
    const tipos = p.tipos ?? [];
    return tipos.includes('REVENTA') || tipos.includes('COMIDA');
  }

  get totalNumero(): number {
    return Number(this.venta?.totalVenta ?? 0);
  }

  get totalCLP(): number {
    // tu total viene como string decimal ("1500.00")
    return Math.round(Number(this.venta?.totalVenta ?? 0));
  }

  get montoRecibido(): number {
    return this.parseCLP(this.montoRecibidoStr);
  }

  get cambio(): number {
    if (this.medioPago !== 'EFECTIVO') return 0;
    const cambio = this.montoRecibido - this.totalCLP;
    return cambio;
  }

  get cambioTexto(): string {
    if (this.medioPago !== 'EFECTIVO') return '';
    if (!this.totalCLP) return '';
    if (!this.montoRecibidoStr.trim()) return '';
    return this.cambio >= 0 ? 'Cambio' : 'Faltan';
  }

  // ---------- Data ----------
  cargarVenta() {
    this.loading = true;
    this.errorMsg = '';

    this.ventasService.obtenerVenta(this.idVenta).subscribe({
      next: (res) => {
        this.venta = res;

        (res.items ?? []).forEach((it) => {
          this.editCantidad[it.idItem] = it.cantidad;
        });

        // Si backend ya trae medioPago (confirmada), reflejarlo
        this.medioPago = res.medioPago ?? null;
        this.didAutoFocus = false;
        this.loading = false;
        
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'No se pudo cargar la venta.';
      },
    });
    
  }

  cargarProductos() {
    this.productosLoading = true;
    this.productosError = '';

    this.productosService.list(false).subscribe({
      next: (data) => {
        this.productos = data ?? [];
      },
      error: (err) => {
        this.productosError = err?.error?.message ?? 'No se pudieron cargar productos.';
      },
      complete: () => {
        this.productosLoading = false;
      },
    });
  }


  // ---------- POS: sugerencias ----------
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
        if (!this.isVendible(p)) return false;
        const name = this.norm(p.name);
        const code = this.norm(p.internalCode);
        const barcode = this.norm(p.barcode ?? '');
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);

    this.sugerencias = matches;
    this.showSug = matches.length > 0;
    this.activeSugIndex = this.showSug ? 0 : -1;
  }

  onScanEnter() {
    this.scanError = '';

    if (!this.enEdicion) {
      this.scanError = 'La venta no está en edición.';
      return;
    }

    if (this.savingItemId !== null) return;

    const raw = (this.scan || '').trim();
    if (!raw) return;

    const cant = Number(this.cantidadRapida);
    if (!Number.isFinite(cant) || cant <= 0) {
      this.scanError = 'Cantidad rápida inválida (debe ser > 0).';
      return;
    }

    if (this.isBarcodeLike(raw)) {
      this.productosService.lookupByBarcode(raw).subscribe({
        next: (res) => {
          if (!res?.id) {
            this.scanError = 'Barcode no asociado a un producto válido.';
            return;
          }
          if (!this.isVendible(res)) {
            this.scanError = 'Producto no está habilitado para venta.';
            return;
          }
          this.addByProducto(res, cant);
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.scanError = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Barcode no encontrado.');
        },
      });
      return;
    }

    if (this.sugerencias.length > 0) {
      const sug = this.sugerencias[0];
      this.addByProducto(sug, cant);
      return;
    }

    this.scanError = 'Sin coincidencias para agregar.';
  }

  seleccionarSug(s: Producto) {
    this.activeSugIndex = this.sugerencias.findIndex((x) => x.id === s.id);
    this.scanError = '';

    const cant = Number(this.cantidadRapida);
    if (!Number.isFinite(cant) || cant <= 0) {
      this.scanError = 'Cantidad rápida inválida (debe ser > 0).';
      return;
    }

    this.addByProducto(s, cant);
  }

  private addByProducto(producto: Producto, cantidad: number) {
    this.itemError = '';
    this.scanError = '';

    if (!this.enEdicion) {
      this.scanError = 'La venta no está en edición.';
      return;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.scanError = 'La cantidad debe ser mayor a 0.';
      return;
    }

    if (!this.isVendible(producto)) {
      this.scanError = 'Producto no está habilitado para venta.';
      return;
    }

    const precio = Number(producto.precioVenta ?? 0);
    if (!Number.isFinite(precio) || precio < 0) {
      this.scanError = 'El producto no tiene un precio de venta válido.';
      return;
    }

    this.savingItemId = 0;

    this.ventasService
      .agregarItem(this.idVenta, {
        productoId: String(producto.id),
        cantidad,
      })
      .subscribe({
        next: (venta) => {
          this.venta = venta;
          (venta.items ?? []).forEach((it) => (this.editCantidad[it.idItem] = it.cantidad));

          this.savingItemId = null;

          this.scan = '';
          this.cantidadRapida = 1;
          this.closeSug();
          this.didAutoFocus = false;
        },
        error: (err) => {
          this.savingItemId = null;
          const msg = err?.error?.message;
          this.scanError = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo agregar el producto.');
          this.didAutoFocus = false;
        },
      });
  }

  // ---------- Items ----------
  guardarCantidad(item: VentaItemResponse) {
    this.itemError = '';

    if (!this.enEdicion) {
      this.itemError = 'La venta no está en edición.';
      return;
    }

    const cantidad = Number(this.editCantidad[item.idItem]);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.itemError = 'La cantidad debe ser mayor a 0.';
      return;
    }

    this.savingItemId = item.idItem;

    this.ventasService.actualizarItem(this.idVenta, item.idItem, { cantidad }).subscribe({
      next: (venta) => {
        this.venta = venta;
        (venta.items ?? []).forEach((it) => (this.editCantidad[it.idItem] = it.cantidad));
        this.savingItemId = null;
      },
      error: (err) => {
        this.savingItemId = null;
        this.itemError = err?.error?.message ?? 'No se pudo actualizar la cantidad.';
      },
    });
  }


  eliminarItem(item: VentaItemResponse) {
    this.itemError = '';

    if (!this.enEdicion) {
      this.itemError = 'La venta no está en edición.';
      return;
    }

    this.savingItemId = item.idItem;

    this.ventasService.eliminarItem(this.idVenta, item.idItem).subscribe({
      next: (venta) => {
        this.venta = venta;
        this.savingItemId = null;
      },
      error: (err) => {
        this.savingItemId = null;
        this.itemError = err?.error?.message ?? 'No se pudo eliminar el producto.';
      },
    });
  }

  // ---------- Medio de pago / caja registradora ----------
  setMedioPago(mp: MedioPago) {
    this.medioPago = mp;

    // si cambia a tarjeta, limpiar efectivo
    if (mp !== 'EFECTIVO') {
      this.montoRecibidoStr = '';
      this.montoRecibidoError = '';
    }
  }

  onMontoRecibidoChange(v: string) {
    this.montoRecibidoStr = v;
    this.montoRecibidoError = '';

    if (this.medioPago !== 'EFECTIVO') return;

    // Validación suave: si escribió algo, que sea >= total
    if (v.trim().length > 0) {
      const recibido = this.montoRecibido;
      if (recibido <= 0) {
        this.montoRecibidoError = 'Monto recibido inválido.';
      }
    }
  }

  // ---------- Navegación / Confirmación ----------
  volver() {
    this.router.navigate(['/pos/caja']);
  }

  confirmarVenta() {
    this.confirmError = '';
    this.confirmMsg = '';
    this.montoRecibidoError = '';

    if (!this.enEdicion) {
      this.confirmError = 'La venta no está en edición.';
      return;
    }

    const items = this.venta?.items ?? [];
    if (!items.length || this.totalNumero <= 0) {
      this.confirmError = 'No puedes confirmar una venta sin productos o con total 0.';
      return;
    }

    if (!this.medioPago) {
      this.confirmError = 'Debes seleccionar un medio de pago.';
      return;
    }

    if (this.medioPago === 'EFECTIVO') {
      const recibido = this.montoRecibido;
      if (this.montoRecibidoStr.trim() && recibido < this.totalCLP) {
        this.montoRecibidoError = 'El monto recibido es menor que el total.';
        return;
      }
    }

    this.confirmando = true;

    this.ventasService.confirmarVenta(this.idVenta, { medioPago: this.medioPago }).subscribe({
      next: (venta) => {
        this.venta = venta;
        this.confirmando = false;
        this.confirmMsg = 'Venta confirmada correctamente.';
        this.closeSug();

        // “caja registradora”: limpiar inputs
        this.montoRecibidoStr = '';
      },
      error: (err) => {
        this.confirmando = false;
        this.confirmError = err?.error?.message ?? 'No se pudo confirmar la venta.';
      },
    });
  }

  onScanKeydown(ev: KeyboardEvent) {
    if (!this.enEdicion) return;

    // Si no hay dropdown, dejamos que Enter siga siendo "agregar" normal
    if (!this.showSug || this.sugerencias.length === 0) {
      if (ev.key === 'Escape') this.closeSug();
      return;
    }

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.activeSugIndex = this.clampSugIndex(this.activeSugIndex + 1);
      this.scrollActiveSuggestionIntoView();
      return;
    }

    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.activeSugIndex = this.clampSugIndex(this.activeSugIndex - 1);
      this.scrollActiveSuggestionIntoView();
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
      return;
    }
  }
}

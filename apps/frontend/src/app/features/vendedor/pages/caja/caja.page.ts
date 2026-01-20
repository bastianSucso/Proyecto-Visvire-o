import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CajaActualResponse, CajaService } from '../../../../core/services/caja.service';
import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { HistorialService, IncidenciaTipo } from '../../../../core/services/historial.service';
import { Router } from '@angular/router';
import { IncidenciasService } from '../../../../core/services/incidencias.service';
import { VentaListItem, VentasService } from '../../../../core/services/ventas.service';


@Component({
  selector: 'app-caja-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './caja.page.html',
})
export class CajaPage implements OnInit {
  cajaActual: CajaActualResponse | null = null;
  loading = false;
  errorMsg = '';

  // productos (para vendedor)
  productos: Producto[] = [];
  productosLoading = false;
  productosError = '';
  filtro = '';

  // incidencia
  incidenciaMsg = '';
  incidenciaError = '';
  incidenciaLoading = false;

  //nueva venta
  creandoVenta = false;
  ventaError = '';

  ventas: VentaListItem[] = [];
  ventasLoading = false;
  ventasError = '';

  form;
  incidenciaForm;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private cajaService: CajaService,
    private productosService: ProductosService,
    private incidenciaService: IncidenciasService,
    private ventasService: VentasService,
  ) {
    this.form = this.fb.group({
      montoInicial: [0, [Validators.required, Validators.min(0)]],
    });

    this.incidenciaForm = this.fb.group({
      productoId: ['', [Validators.required]],
      tipo: ['FALTANTE' as IncidenciaTipo, [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      observacion: [''],
    });
  }

  private toNumberMoney(v: unknown): number {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  get cajaAbierta(): boolean {
    return this.cajaActual?.estado === 'ABIERTA';
  }
  
  get ventasEnEdicion(): VentaListItem[] {
    return this.ventas.filter(v => v.estado === 'EN_EDICION');
  }
  get ventasConfirmadas(): VentaListItem[] {
    return this.ventas.filter(v => v.estado === 'CONFIRMADA');
  }
  get ventasConfirmadasTurno(): VentaListItem[] {
    return (this.ventas ?? []).filter(v => v.estado === 'CONFIRMADA');
  }

  get totalVentasCLP(): number {
    return this.ventasConfirmadasTurno.reduce((acc, v) => acc + this.toNumberMoney(v.totalVenta), 0);
  }

  get totalEfectivoCLP(): number {
    return this.ventasConfirmadasTurno
      .filter(v => v.medioPago === 'EFECTIVO')
      .reduce((acc, v) => acc + this.toNumberMoney(v.totalVenta), 0);
  }

  get totalTarjetaCLP(): number {
    return this.ventasConfirmadasTurno
      .filter(v => v.medioPago === 'TARJETA')
      .reduce((acc, v) => acc + this.toNumberMoney(v.totalVenta), 0);
  }

  get montoInicialCLP(): number {
    return this.toNumberMoney(this.cajaActual?.montoInicial);
  }

  // Si quieres “Monto total caja” = inicial + ventas confirmadas
  get montoTotalCajaCLP(): number {
    return this.montoInicialCLP + this.totalVentasCLP;
  }

  ngOnInit() {
    this.cargarCajaActual();
  }

  cargarCajaActual() {
    this.loading = true;
    this.errorMsg = '';
    this.cajaService.cajaActual().subscribe({
      next: (res) => {
        this.cajaActual = res;
        this.loading = false;

        // si hay caja abierta, cargamos productos operativos
        if (this.cajaActual?.estado === 'ABIERTA') {
          this.cargarProductosSala();
          this.cargarVentasTurno();
        } else {
          this.productos = [];
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'Error al obtener estado de caja.';
      },
    });
  }

  abrirCaja() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const monto = Number(this.form.value.montoInicial);

    this.cajaService.abrirCaja(monto).subscribe({
      next: (res) => {
        this.cajaActual = res;
        this.loading = false;

        // al abrir caja, cargar productos para incidencias
        if (this.cajaActual?.estado === 'ABIERTA') {
          this.cargarProductosSala();
          this.cargarVentasTurno();
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'No se pudo abrir caja.';
      },
    });
  }

  cargarProductosSala() {
    this.productosLoading = true;
    this.productosError = '';
    this.productosService.list(false).subscribe({
      next: (data) => {
        // muestra solo activos y opcionalmente solo stock en sala >= 0 (ya lo es)
        this.productos = data;
      },
      error: (err) => {
        this.productosError = err?.error?.message ?? 'No se pudieron cargar productos.';
      },
      complete: () => {
        this.productosLoading = false;
      },
    });
  }

  get productosFiltrados(): Producto[] {
    const q = (this.filtro || '').trim().toLowerCase();
    if (!q) return this.productos;

    return this.productos.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const code = (p.internalCode || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || barcode.includes(q);
    });
  }

  seleccionarProducto(p: Producto) {
    this.incidenciaForm.patchValue({ productoId: p.id });
  }

  irAProductosSala() {
    const historialId = this.cajaActual?.historial?.idHistorial;
    this.router.navigate(['/pos/productos-sala'], {
      queryParams: { historialId: historialId ?? null },
    });
  }

  registrarIncidencia() {
    this.incidenciaMsg = '';
    this.incidenciaError = '';

    if (!this.cajaActual?.historial?.idHistorial) {
      this.incidenciaError = 'No hay historial activo asociado a la caja.';
      return;
    }

    if (this.incidenciaForm.invalid) {
      this.incidenciaForm.markAllAsTouched();
      return;
    }

    this.incidenciaLoading = true;

    const v = this.incidenciaForm.value;

    const payload = {
      historialId: this.cajaActual.historial.idHistorial,
      productoId: String(v.productoId),
      tipo: v.tipo as IncidenciaTipo,
      cantidad: Number(v.cantidad),
      observacion: (v.observacion ?? '').trim() || undefined,
    };

    this.incidenciaService.crearIncidencia(payload).subscribe({
      next: () => {
        this.incidenciaMsg = 'Incidencia registrada correctamente.';
        this.incidenciaForm.patchValue({ cantidad: 1, observacion: '' });
        this.incidenciaLoading = false;
      },
      error: (err) => {
        this.incidenciaLoading = false;
        const msg = err?.error?.message;
        this.incidenciaError = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar la incidencia.');
      },
    });
  }

  nuevaVenta() {
    this.ventaError = '';

    if (!this.cajaAbierta) {
      this.ventaError = 'No se puede crear una venta si la caja no está abierta.';
      return;
    }

    this.creandoVenta = true;

    this.ventasService.crearVenta().subscribe({
      next: (venta) => {
        this.creandoVenta = false;
        this.router.navigate(['/pos/ventas', venta.idVenta]);
      },
      error: (err) => {
        this.creandoVenta = false;
        this.ventaError = err?.error?.message ?? 'No se pudo crear la venta.';
      },
    });
  }

  cargarVentasTurno() {
    const historialId = this.cajaActual?.historial?.idHistorial;
    if (!historialId) return;

    this.ventasLoading = true;
    this.ventasError = '';

    this.ventasService.listar(historialId).subscribe({
      next: (data) => (this.ventas = data ?? []),
      error: (err) => {
        this.ventasError = err?.error?.message ?? 'No se pudieron cargar las ventas del turno.';
      },
      complete: () => (this.ventasLoading = false),
    });
  }
  
  continuarVenta(idVenta: number) {
    this.router.navigate(['/pos/ventas', idVenta]);
  }

  verVenta(idVenta: number) {
    this.router.navigate(['/pos/ventas', idVenta]); // misma vista, pero bloqueada por estado
  }

  eliminarVentaEnEdicion(idVenta: number) {
    if (!this.cajaAbierta) return;

    const ok = window.confirm(`¿Seguro que deseas eliminar la Venta #${idVenta}?\n\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    this.ventaError = '';

    this.ventasService.eliminarVenta(idVenta).subscribe({
      next: () => {
        // refrescar lista
        this.cargarVentasTurno();
      },
      error: (err) => {
        this.ventaError = err?.error?.message ?? 'No se pudo eliminar la venta.';
      }
    });
  }


}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CajaActualResponse, CajaService } from '../../../../core/services/caja.service';
import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { HistorialService, IncidenciaTipo } from '../../../../core/services/historial.service';
import { Router } from '@angular/router';
import { IncidenciasService } from '../../../../core/services/incidencias.service';

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

  form;
  incidenciaForm;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private cajaService: CajaService,
    private productosService: ProductosService,
    private incidenciaService: IncidenciasService,
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
}

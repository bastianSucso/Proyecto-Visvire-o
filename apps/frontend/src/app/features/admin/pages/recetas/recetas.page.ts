import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { RecetasService, RecetaItem, RecetaCostoResponse } from '../../../../core/services/recetas.service';
import { InsumoGruposService, InsumoGrupo } from '../../../../core/services/insumo-grupos.service';

@Component({
  selector: 'app-recetas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './recetas.page.html',
})
export class RecetasPage {
  private fb = inject(FormBuilder);
  private productosService = inject(ProductosService);
  private recetasService = inject(RecetasService);
  private gruposService = inject(InsumoGruposService);
  private route = inject(ActivatedRoute);

  productos: Producto[] = [];
  comidas: Producto[] = [];
  grupos: InsumoGrupo[] = [];

  selectedComidaId: string | null = null;
  selectedComida: Producto | null = null;

  receta: RecetaItem[] = [];
  costos: RecetaCostoResponse | null = null;

  pendingComidaId: string | null = null;

  loading = false;
  errorMsg = '';

  rendimientoForm = this.fb.group({
    rendimiento: [null as number | null, [Validators.min(0)]],
  });

  recetaForm = this.fb.group({
    grupoId: ['', [Validators.required]],
    cantidadBase: [0, [Validators.required, Validators.min(0.0001)]],
  });

  editCantidad: Record<number, number> = {};

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const comidaId = params.get('comidaId');
      this.pendingComidaId = comidaId;
      if (comidaId && this.comidas.length > 0) {
        this.onSelectComida(comidaId);
      }
    });
    this.loadProductos();
  }

  loadProductos() {
    this.loading = true;
    this.productosService.list(true).subscribe({
      next: (data) => {
        this.productos = data ?? [];
        this.comidas = this.productos.filter((p) => p.tipo === 'COMIDA');
        this.loadGrupos();
        if (this.pendingComidaId) {
          const exists = this.comidas.find((c) => c.id === this.pendingComidaId);
          if (exists) this.onSelectComida(this.pendingComidaId);
        }
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
      complete: () => (this.loading = false),
    });
  }

  loadGrupos() {
    this.gruposService.list(true).subscribe({
      next: (data) => {
        this.grupos = data ?? [];
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  onSelectComida(id: string) {
    this.selectedComidaId = id || null;
    this.selectedComida = this.comidas.find((c) => c.id === id) ?? null;
    this.receta = [];
    this.costos = null;
    this.editCantidad = {};

    if (!this.selectedComidaId) return;

    this.rendimientoForm.reset({
      rendimiento: this.selectedComida?.rendimiento ? Number(this.selectedComida.rendimiento) : null,
    });

    this.loadReceta();
  }

  loadReceta() {
    if (!this.selectedComidaId) return;
    this.recetasService.list(this.selectedComidaId).subscribe({
      next: (data) => {
        this.receta = data ?? [];
        (this.receta ?? []).forEach((r) => {
          this.editCantidad[r.id] = Number(r.cantidadBase ?? 0);
        });
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
    });

    this.recetasService.costos(this.selectedComidaId).subscribe({
      next: (data) => {
        this.costos = data;
      },
      error: () => {},
    });
  }

  guardarRendimiento() {
    if (!this.selectedComida) return;
    if (this.rendimientoForm.invalid) {
      this.rendimientoForm.markAllAsTouched();
      return;
    }

    const rendimiento = this.rendimientoForm.value.rendimiento;
    const payload = { rendimiento: rendimiento === null ? undefined : Number(rendimiento) };
    this.productosService.update(this.selectedComida.id, payload).subscribe({
      next: () => this.loadReceta(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  agregarInsumo() {
    if (!this.selectedComidaId) return;
    if (this.recetaForm.invalid) {
      this.recetaForm.markAllAsTouched();
      return;
    }

    const v = this.recetaForm.value;
    const payload = {
      comidaId: this.selectedComidaId,
      grupoId: String(v.grupoId),
      cantidadBase: Number(v.cantidadBase ?? 0),
    };

    this.recetasService.create(payload).subscribe({
      next: () => {
        this.recetaForm.reset({ grupoId: '', cantidadBase: 0 });
        this.loadReceta();
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  get selectedGrupoUnidad(): string {
    const grupoId = this.recetaForm.value.grupoId;
    if (!grupoId) return '-';
    return this.grupos.find((g) => g.id === grupoId)?.unidadBase ?? '-';
  }

  actualizarCantidad(item: RecetaItem) {
    const cantidad = Number(this.editCantidad[item.id]);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.errorMsg = 'Cantidad inválida.';
      return;
    }

    this.recetasService.update(item.id, { cantidadBase: cantidad }).subscribe({
      next: () => this.loadReceta(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  eliminar(item: RecetaItem) {
    const ok = confirm('¿Eliminar este insumo de la receta?');
    if (!ok) return;

    this.recetasService.remove(item.id).subscribe({
      next: () => this.loadReceta(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;

    if (status === 409) return 'Conflicto al guardar. Revisa los datos.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}

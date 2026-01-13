import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CajaActualResponse, CajaService } from '../../../../core/services/caja.service';

@Component({
  selector: 'app-caja-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './caja.page.html',
})
export class CajaPage implements OnInit {
  cajaActual: CajaActualResponse | null = null;
  loading = false;
  errorMsg = '';

  form;

  constructor(
    private fb: FormBuilder,
    private cajaService: CajaService,
  ) {
    this.form = this.fb.group({
      montoInicial: [0, [Validators.required, Validators.min(0)]],
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
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'No se pudo abrir caja.';
      },
    });
  }
}

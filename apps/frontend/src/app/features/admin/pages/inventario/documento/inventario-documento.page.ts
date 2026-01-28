import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InventarioService, InventarioDocumento } from '../../../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-documento-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: 'inventario-documento.page.html',
})
export class InventarioDocumentoPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioService);

  documento: InventarioDocumento | null = null;
  loading = false;
  errorMsg = '';

  ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = Number(raw);
    if (!id || Number.isNaN(id)) {
      this.errorMsg = 'ID de documento inválido.';
      return;
    }

    this.loading = true;
    this.inventarioService.obtenerDocumento(id).subscribe({
      next: (doc) => (this.documento = doc),
      error: (err) => (this.errorMsg = err?.error?.message ?? 'No se pudo cargar el documento.'),
      complete: () => (this.loading = false),
    });
  }

  volver() {
    this.router.navigate(['/admin/inventario']);
  }
}

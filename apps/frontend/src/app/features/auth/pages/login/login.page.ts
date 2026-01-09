import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.page.html',
})
export class LoginPage {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);
    year = new Date().getFullYear();

    loading = false;
    errorMsg = '';

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
    });

    submit() {
        this.errorMsg = '';
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: () => {
        const role = this.auth.user?.role;

        // Ajusta rutas reales
        if (role === 'ADMIN') this.router.navigate(['/admin']);
        else this.router.navigate(['/pos']);
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Credenciales inválidas';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}

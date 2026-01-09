import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: 'admin-layout.component.html',
})
export class AdminLayoutComponent {
  auth = inject(AuthService);

  logout() {
    this.auth.logout();
  }
}

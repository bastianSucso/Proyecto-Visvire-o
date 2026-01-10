import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  public auth = inject(AuthService);

  // Desktop: sidebar colapsado/expandido
  isCollapsed = false;

  // Mobile: drawer abierto/cerrado
  isMobileOpen = false;

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  openMobile() {
    this.isMobileOpen = true;
  }

  closeMobile() {
    this.isMobileOpen = false;
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  logout() {
    this.auth.logout();
  }
}

import { Component } from '@angular/core';
import { AlojamientoHomePage } from '../../../vendedor/pages/alojamiento-home/alojamiento-home.page';

@Component({
  selector: 'app-admin-alojamiento-home-page',
  standalone: true,
  imports: [AlojamientoHomePage],
  templateUrl: './alojamiento-home.page.html',
})
export class AdminAlojamientoHomePage {}

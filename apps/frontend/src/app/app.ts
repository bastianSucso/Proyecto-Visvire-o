import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  
  private api = inject(ApiService);

  ngOnInit() {
    this.api.health().subscribe({
      next: (res) => console.log('HEALTH OK:', res),
      error: (err) => console.error('HEALTH ERROR:', err),
    });
  }
}

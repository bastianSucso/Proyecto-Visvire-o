import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { typeOrmConfig } from './database/typeorm.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductosModule } from './modules/productos/productos.module';
import { HistorialModule } from './modules/historial/historial.module';
import { CajaModule } from './modules/caja/caja.module';
import { VentasModule } from './modules/ventas/ventas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
      envFilePath: process.env.NODE_ENV === 'production'
            ? ['../../.env.prod']
            : ['../../.env.dev'],
    }),
    TypeOrmModule.forRoot(typeOrmConfig()),
    HealthModule,
    UsersModule,
    AuthModule,
    ProductosModule,
    HistorialModule,
    CajaModule,
    VentasModule,
  ],
})
export class AppModule {}

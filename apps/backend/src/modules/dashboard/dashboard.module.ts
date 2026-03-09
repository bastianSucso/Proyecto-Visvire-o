import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { VentaEntity } from '../ventas/entities/venta.entity';
import { VentaAlojamientoEntity } from '../alojamiento/entities/venta-alojamiento.entity';
import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';
import { HabitacionEntity } from '../alojamiento/entities/habitacion.entity';
import { AsignacionHabitacionEntity } from '../alojamiento/entities/asignacion-habitacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VentaEntity,
      VentaAlojamientoEntity,
      SesionCajaEntity,
      HabitacionEntity,
      AsignacionHabitacionEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

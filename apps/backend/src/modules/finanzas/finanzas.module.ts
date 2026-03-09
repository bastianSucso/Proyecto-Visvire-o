import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { MovimientoFinancieroEntity } from './entities/movimiento-financiero.entity';
import { VentaEntity } from '../ventas/entities/venta.entity';
import { VentaAlojamientoEntity } from '../alojamiento/entities/venta-alojamiento.entity';
import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MovimientoFinancieroEntity,
      VentaEntity,
      VentaAlojamientoEntity,
      SesionCajaEntity,
    ]),
  ],
  controllers: [FinanzasController],
  providers: [FinanzasService],
  exports: [FinanzasService],
})
export class FinanzasModule {}

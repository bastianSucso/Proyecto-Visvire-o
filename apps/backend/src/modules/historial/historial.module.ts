import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockSesionCajaEntity } from './entities/stock-sesion-caja.entity';
import { HistorialService } from './historial.service';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { SesionCajaEntity } from './entities/sesion-caja.entity';
import { SesionCajaController } from './historial.controller';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SesionCajaEntity,
      StockSesionCajaEntity,
      IncidenciaStockEntity,
      ProductoEntity,
      UbicacionEntity,
    ]),
  ],
  exports: [TypeOrmModule, HistorialService],
  controllers: [SesionCajaController],
  providers: [HistorialService],
})
export class HistorialModule {}

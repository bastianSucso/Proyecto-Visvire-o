import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialStockVentaEntity } from './entities/historial-stock-venta.entity';
import { HistorialService } from './historial.service';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { SesionCajaEntity } from './entities/sesion-caja.entity';
import { SesionCajaController } from './historial.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SesionCajaEntity, HistorialStockVentaEntity, IncidenciaStockEntity, ProductoEntity])],
  exports: [TypeOrmModule, HistorialService],
  controllers: [SesionCajaController],
  providers: [HistorialService],
})
export class HistorialModule {}

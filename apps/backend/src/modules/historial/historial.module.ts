import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialEntity } from './entities/historial.entity';
import { HistorialStockVentaEntity } from './entities/historial-stock-venta.entity';
import { HistorialController } from './historial.controller';
import { HistorialService } from './historial.service';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialEntity, HistorialStockVentaEntity, IncidenciaStockEntity, ProductoEntity])],
  exports: [TypeOrmModule, HistorialService],
  controllers: [HistorialController],
  providers: [HistorialService],
})
export class HistorialModule {}

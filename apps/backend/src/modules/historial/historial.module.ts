import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialEntity } from './entities/historial.entity';
import { HistorialStockVentaEntity } from './entities/historial-stock-venta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialEntity, HistorialStockVentaEntity])],
  exports: [TypeOrmModule],
})
export class HistorialModule {}

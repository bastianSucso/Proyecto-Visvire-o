import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { VentaEntity } from './entities/venta.entity';
import { VentaItemEntity } from './entities/venta-item.entity';
import { HistorialEntity } from '../historial/entities/historial.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VentaEntity, VentaItemEntity, HistorialEntity, ProductoEntity])],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}

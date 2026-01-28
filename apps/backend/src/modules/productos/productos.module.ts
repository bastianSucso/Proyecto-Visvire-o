import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { ProductoStockEntity } from './entities/producto-stock.entity';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductoEntity, ProductoStockEntity, UbicacionEntity])],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}

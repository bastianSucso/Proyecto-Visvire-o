import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { ProductoStockEntity } from './entities/producto-stock.entity';
import { ProductoTipoEntity } from './entities/producto-tipo.entity';
import { RecetaEntity } from './entities/receta.entity';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { RecetasController } from './recetas.controller';
import { RecetasService } from './recetas.service';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductoEntity,
      ProductoStockEntity,
      ProductoTipoEntity,
      RecetaEntity,
      UbicacionEntity,
    ]),
  ],
  controllers: [ProductosController, RecetasController],
  providers: [ProductosService, RecetasService],
})
export class ProductosModule {}

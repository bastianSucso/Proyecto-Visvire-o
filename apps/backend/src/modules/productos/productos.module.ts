import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { ProductoStockEntity } from './entities/producto-stock.entity';
import { RecetaEntity } from './entities/receta.entity';
import { InsumoGrupoEntity } from './entities/insumo-grupo.entity';
import { InsumoGrupoItemEntity } from './entities/insumo-grupo-item.entity';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { RecetasController } from './recetas.controller';
import { RecetasService } from './recetas.service';
import { InsumoGruposController } from './insumo-grupos.controller';
import { InsumoGruposService } from './insumo-grupos.service';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { UnidadMedidaEntity } from './entities/unidad-medida.entity';
import { UnidadesMedidaService } from './unidades-medida.service';
import { UnidadesMedidaController } from './unidades-medida.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductoEntity,
      ProductoStockEntity,
      RecetaEntity,
      InsumoGrupoEntity,
      InsumoGrupoItemEntity,
      UbicacionEntity,
      UnidadMedidaEntity,
    ]),
  ],
  controllers: [ProductosController, RecetasController, InsumoGruposController, UnidadesMedidaController],
  providers: [ProductosService, RecetasService, InsumoGruposService, UnidadesMedidaService],
  exports: [RecetasService, UnidadesMedidaService],
})
export class ProductosModule {}

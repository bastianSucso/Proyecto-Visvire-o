import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { AlteraEntity } from './entities/altera.entity';
import { ProductoConversionEntity } from './entities/producto-conversion.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { ProductoTipoEntity } from '../productos/entities/producto-tipo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlteraEntity,
      ProductoConversionEntity,
      ProductoEntity,
      UbicacionEntity,
      ProductoStockEntity,
      ProductoTipoEntity
    ]),
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
})
export class InventarioModule {}

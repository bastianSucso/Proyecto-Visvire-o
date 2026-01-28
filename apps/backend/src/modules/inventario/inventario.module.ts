import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { AlteraEntity } from './entities/altera.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { InventarioDocumentoEntity } from './entities/inventario-documento.entity';
import { InventarioDocumentoItemEntity } from './entities/inventario-documento-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlteraEntity,
      InventarioDocumentoEntity,
      InventarioDocumentoItemEntity,
      ProductoEntity,
      UbicacionEntity,
      ProductoStockEntity,
    ]),
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
})
export class InventarioModule {}

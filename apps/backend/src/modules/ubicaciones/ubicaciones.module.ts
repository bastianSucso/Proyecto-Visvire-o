import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UbicacionEntity } from './entities/ubicacion.entity';
import { UbicacionesService } from './ubicaciones.service';
import { UbicacionesController } from './ubicaciones.controller';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { StockSesionCajaEntity } from '../historial/entities/stock-sesion-caja.entity';
import { IncidenciaStockEntity } from '../historial/entities/incidencia-stock.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { AlteraEntity } from '../inventario/entities/altera.entity';
import { InventarioDocumentoEntity } from '../inventario/entities/inventario-documento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UbicacionEntity,
      ProductoStockEntity,
      ProductoEntity,
      StockSesionCajaEntity,
      IncidenciaStockEntity,
      AlteraEntity,
      InventarioDocumentoEntity,
    ]),
  ],
  controllers: [UbicacionesController],
  providers: [UbicacionesService],
  exports: [UbicacionesService, TypeOrmModule],
})
export class UbicacionesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockSesionCajaEntity } from './entities/stock-sesion-caja.entity';
import { HistorialService } from './historial.service';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { SesionCajaEntity } from './entities/sesion-caja.entity';
import { SesionCajaController } from './historial.controller';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { AlteraEntity } from '../inventario/entities/altera.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { InconsistenciasAdminController } from './inconsistencias-admin.controller';
import { IncidenciaResolucionAdminEntity } from './entities/incidencia-resolucion-admin.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SesionCajaEntity,
      StockSesionCajaEntity,
      IncidenciaStockEntity,
      IncidenciaResolucionAdminEntity,
      ProductoEntity,
      ProductoStockEntity,
      UbicacionEntity,
      AlteraEntity,
    ]),
    InventarioModule,
  ],
  exports: [TypeOrmModule, HistorialService],
  controllers: [SesionCajaController, InconsistenciasAdminController],
  providers: [HistorialService],
})
export class HistorialModule {}

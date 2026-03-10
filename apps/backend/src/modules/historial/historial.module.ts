import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockSesionCajaEntity } from './entities/stock-sesion-caja.entity';
import { HistorialService } from './historial.service';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { SesionCajaEntity } from './entities/sesion-caja.entity';
import { SesionCajaController } from './historial.controller';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { IncidenciaRevisionAdminEntity } from './entities/incidencia-revision-admin.entity';
import { IncidenciaRevisionBitacoraEntity } from './entities/incidencia-revision-bitacora.entity';
import { AlteraEntity } from '../inventario/entities/altera.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { InconsistenciasAdminController } from './inconsistencias-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SesionCajaEntity,
      StockSesionCajaEntity,
      IncidenciaStockEntity,
      IncidenciaRevisionAdminEntity,
      IncidenciaRevisionBitacoraEntity,
      ProductoEntity,
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

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
import { InconsistenciaCategoriaEntity } from './entities/inconsistencia-categoria.entity';
import { InconsistenciasCategoriasService } from './inconsistencias-categorias.service';
import { InconsistenciasCategoriasController } from './inconsistencias-categorias.controller';
import { InconsistenciasCategoriasAdminController } from './inconsistencias-categorias-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SesionCajaEntity,
      StockSesionCajaEntity,
      IncidenciaStockEntity,
      IncidenciaResolucionAdminEntity,
      InconsistenciaCategoriaEntity,
      ProductoEntity,
      ProductoStockEntity,
      UbicacionEntity,
      AlteraEntity,
    ]),
    InventarioModule,
  ],
  exports: [TypeOrmModule, HistorialService],
  controllers: [
    SesionCajaController,
    InconsistenciasAdminController,
    InconsistenciasCategoriasController,
    InconsistenciasCategoriasAdminController,
  ],
  providers: [HistorialService, InconsistenciasCategoriasService],
})
export class HistorialModule {}

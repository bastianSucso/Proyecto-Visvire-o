import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { VentaEntity } from './entities/venta.entity';
import { VentaItemEntity } from './entities/venta-item.entity';
import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { AlteraEntity } from '../inventario/entities/altera.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VentaEntity,
      VentaItemEntity,
      SesionCajaEntity,
      ProductoEntity,
      UbicacionEntity,
      ProductoStockEntity,
      AlteraEntity,
    ]),
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}

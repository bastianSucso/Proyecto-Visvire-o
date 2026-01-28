import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CajaEntity } from './entities/caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { StockSesionCajaEntity } from '../historial/entities/stock-sesion-caja.entity';
import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CajaEntity,
      SesionCajaEntity,
      ProductoEntity,
      StockSesionCajaEntity,
      ProductoStockEntity,
      UbicacionEntity,
    ]),
  ],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}

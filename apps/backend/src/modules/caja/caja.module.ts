import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CajaEntity } from './entities/caja.entity';
import { HistorialEntity } from '../historial/entities/historial.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { HistorialStockVentaEntity } from '../historial/entities/historial-stock-venta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CajaEntity, HistorialEntity, ProductoEntity, HistorialStockVentaEntity])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}

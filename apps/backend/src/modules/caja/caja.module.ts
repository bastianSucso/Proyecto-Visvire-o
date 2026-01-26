import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CajaEntity } from './entities/caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { HistorialStockVentaEntity } from '../historial/entities/historial-stock-venta.entity';
import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CajaEntity, SesionCajaEntity, ProductoEntity, HistorialStockVentaEntity])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}

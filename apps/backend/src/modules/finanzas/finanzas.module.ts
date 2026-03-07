import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { MovimientoFinancieroEntity } from './entities/movimiento-financiero.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoFinancieroEntity])],
  controllers: [FinanzasController],
  providers: [FinanzasService],
  exports: [FinanzasService],
})
export class FinanzasModule {}

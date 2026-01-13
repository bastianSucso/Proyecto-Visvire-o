import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CajaEntity } from './entities/caja.entity';
import { HistorialEntity } from '../historial/entities/historial.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CajaEntity, HistorialEntity])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasModule } from '../finanzas/finanzas.module';
import { PagoPersonalCambioEntity } from './entities/pago-personal-cambio.entity';
import { PagoPersonalEntity } from './entities/pago-personal.entity';
import { TrabajadorEntity } from './entities/trabajador.entity';
import { RrhhController } from './rrhh.controller';
import { RrhhService } from './rrhh.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrabajadorEntity, PagoPersonalEntity, PagoPersonalCambioEntity]),
    FinanzasModule,
  ],
  controllers: [RrhhController],
  providers: [RrhhService],
})
export class RrhhModule {}

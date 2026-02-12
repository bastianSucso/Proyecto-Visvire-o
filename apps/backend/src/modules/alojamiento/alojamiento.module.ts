import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlojamientoController } from './alojamiento.controller';
import { AlojamientoService } from './alojamiento.service';
import { PisoZonaEntity } from './entities/piso-zona.entity';
import { HabitacionEntity } from './entities/habitacion.entity';
import { CamaEntity } from './entities/cama.entity';
import { ComodidadEntity } from './entities/comodidad.entity';
import { InventarioHabitacionEntity } from './entities/inventario-habitacion.entity';
import { EmpresaHostalEntity } from './entities/empresa-hostal.entity';
import { HuespedEntity } from './entities/huesped.entity';
import { AsignacionHabitacionEntity } from './entities/asignacion-habitacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PisoZonaEntity,
      HabitacionEntity,
      CamaEntity,
      ComodidadEntity,
      InventarioHabitacionEntity,
      EmpresaHostalEntity,
      HuespedEntity,
      AsignacionHabitacionEntity,
    ]),
  ],
  controllers: [AlojamientoController],
  providers: [AlojamientoService],
})
export class AlojamientoModule {}

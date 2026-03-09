import { IsEnum } from 'class-validator';
import { TrabajadorEstado } from '../entities/trabajador.entity';

export class SetTrabajadorEstadoDto {
  @IsEnum(TrabajadorEstado)
  estado!: TrabajadorEstado;
}

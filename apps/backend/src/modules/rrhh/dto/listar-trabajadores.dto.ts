import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrabajadorEstado } from '../entities/trabajador.entity';

export class ListarTrabajadoresDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsEnum(TrabajadorEstado)
  estado?: TrabajadorEstado;
}

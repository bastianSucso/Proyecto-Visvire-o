import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MovimientoFinancieroOrigenTipo,
  MovimientoFinancieroTipo,
} from '../entities/movimiento-financiero.entity';

export class ListarMovimientosFinancierosDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoria?: string;

  @IsOptional()
  @IsEnum(MovimientoFinancieroTipo)
  tipo?: MovimientoFinancieroTipo;

  @IsOptional()
  @IsEnum(MovimientoFinancieroOrigenTipo)
  origenTipo?: MovimientoFinancieroOrigenTipo;
}

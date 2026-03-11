import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export type IncidenciaContextoDto = 'DURANTE_JORNADA' | 'FUERA_JORNADA';

export class CreateIncidenciaStockDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  sesionCajaId?: number;

  @IsNotEmpty()
  @IsUUID()
  productoId!: string;

  @IsOptional()
  @IsUUID()
  ubicacionId?: string;

  @IsOptional()
  @IsIn(['DURANTE_JORNADA', 'FUERA_JORNADA'])
  contexto?: IncidenciaContextoDto;

  @IsOptional()
  @IsDateString()
  fechaHoraDeteccion?: string;

  @IsIn(['FALTANTE', 'DANIO', 'VENCIDO', 'OTRO'])
  tipo!: 'FALTANTE' | 'DANIO' | 'VENCIDO' | 'OTRO';

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

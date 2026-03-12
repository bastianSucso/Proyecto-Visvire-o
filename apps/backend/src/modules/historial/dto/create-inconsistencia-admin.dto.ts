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

export class CreateInconsistenciaAdminDto {
  @IsNotEmpty()
  @IsUUID()
  productoId!: string;

  @IsNotEmpty()
  @IsUUID()
  ubicacionId!: string;

  @IsOptional()
  @IsIn(['DURANTE_JORNADA', 'FUERA_JORNADA'])
  contexto?: 'DURANTE_JORNADA' | 'FUERA_JORNADA';

  @IsOptional()
  @IsDateString()
  fechaHoraDeteccion?: string;

  @IsNotEmpty()
  @IsUUID()
  categoriaId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { AJUSTE_OPERATIVO_CAUSAS } from '../constants/ajuste-operativo-causas';

export class CreateAjusteOperativoDto {
  @IsUUID()
  productoId!: string;

  @IsUUID()
  ubicacionId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad!: number;

  @IsString()
  @IsNotEmpty()
  @IsIn([...AJUSTE_OPERATIVO_CAUSAS])
  causa!: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  observacion?: string;
}

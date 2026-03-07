import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MovimientoFinancieroMetodoPago } from '../entities/movimiento-financiero.entity';

export class CreateIngresoExternoDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  categoria!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsEnum(MovimientoFinancieroMetodoPago)
  metodoPago?: MovimientoFinancieroMetodoPago;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referencia?: string;

  @IsOptional()
  @IsDateString()
  fechaMovimiento?: string;

  @IsOptional()
  @IsBoolean()
  aplicaCreditoFiscal?: boolean;
}

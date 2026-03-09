import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MovimientoFinancieroMetodoPago } from '../../finanzas/entities/movimiento-financiero.entity';

export class UpdatePagoPersonalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  motivo!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto?: number;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  concepto?: string;

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
  @IsString()
  @MaxLength(500)
  adjuntoUrl?: string;
}

import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { MovimientoFinancieroMetodoPago } from '../../finanzas/entities/movimiento-financiero.entity';

export class CreatePagoPersonalDto {
  @IsUUID()
  trabajadorId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  concepto!: string;

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

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  internalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barcode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidadBase?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioCosto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioVenta?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductoTipoEnum } from '../entities/producto.entity';

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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioVenta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rendimiento?: number;

  @IsOptional()
  @IsEnum(ProductoTipoEnum)
  tipo?: ProductoTipoEnum;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

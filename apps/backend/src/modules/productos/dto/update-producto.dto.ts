import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductoTipoEnum } from '../entities/producto-tipo.entity';

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
  @IsIn(['g', 'kg', 'ml', 'l', 'unidad', 'pack'], { message: 'unidadBase inválida' })
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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rendimiento?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ProductoTipoEnum, { each: true })
  tipos?: ProductoTipoEnum[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

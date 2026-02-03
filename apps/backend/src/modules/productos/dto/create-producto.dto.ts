import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductoTipoEnum } from '../entities/producto-tipo.entity';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  internalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @IsIn(['g', 'kg', 'ml', 'l', 'unidad', 'pack'], { message: 'unidadBase inválida' })
  unidadBase?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioCosto: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioVenta: number;

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

}

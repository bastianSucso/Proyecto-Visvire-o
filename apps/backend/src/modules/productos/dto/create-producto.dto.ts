import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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
  unidadBase?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioCosto: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioVenta: number;

}

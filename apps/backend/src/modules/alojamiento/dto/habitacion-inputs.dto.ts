import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CamaInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  item: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;
}

export class InventarioInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  item: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  observacion?: string;
}

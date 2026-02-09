import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CamaInputDto, InventarioInputDto } from './habitacion-inputs.dto';

export class CreateHabitacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  identificador: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsBoolean()
  estadoActivo?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  posX: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  posY: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  ancho: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  alto: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  comodidades?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CamaInputDto)
  camas?: CamaInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventarioInputDto)
  inventario?: InventarioInputDto[];

  @IsOptional()
  @IsBoolean()
  allowOverlap?: boolean;
}

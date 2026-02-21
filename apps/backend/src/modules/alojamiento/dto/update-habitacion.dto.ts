import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CamaInputDto, InventarioInputDto } from './habitacion-inputs.dto';
import { HabitacionEstadoOperativo } from '../entities/habitacion.entity';

export class UpdateHabitacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  identificador?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsBoolean()
  estadoActivo?: boolean;

  @IsOptional()
  @IsEnum(HabitacionEstadoOperativo)
  estadoOperativo?: HabitacionEstadoOperativo;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  posX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  posY?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ancho?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  alto?: number;

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

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInconsistenciaCategoriaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(32767)
  orden?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activa?: boolean;
}

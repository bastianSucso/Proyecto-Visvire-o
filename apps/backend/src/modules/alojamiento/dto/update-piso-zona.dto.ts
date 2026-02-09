import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePisoZonaDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(200)
  anchoLienzo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(200)
  altoLienzo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  tamanoCuadricula?: number;

  @IsOptional()
  @IsBoolean()
  snapActivo?: boolean;
}

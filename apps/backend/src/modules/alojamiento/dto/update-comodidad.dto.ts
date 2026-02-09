import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateComodidadDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

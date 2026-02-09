import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComodidadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

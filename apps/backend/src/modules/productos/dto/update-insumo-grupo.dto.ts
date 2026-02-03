import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InsumoGrupoStrategy } from '../entities/insumo-grupo.entity';

export class UpdateInsumoGrupoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(InsumoGrupoStrategy)
  consumoStrategy?: InsumoGrupoStrategy;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

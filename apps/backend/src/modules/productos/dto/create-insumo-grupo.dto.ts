import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { InsumoGrupoStrategy } from '../entities/insumo-grupo.entity';

export class CreateInsumoGrupoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEnum(InsumoGrupoStrategy)
  consumoStrategy: InsumoGrupoStrategy;
}

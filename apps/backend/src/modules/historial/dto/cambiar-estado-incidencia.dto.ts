import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CambiarEstadoIncidenciaDto {
  @IsIn(['PENDIENTE', 'EN_REVISION', 'RESUELTA_CON_AJUSTE', 'RESUELTA_SIN_AJUSTE'])
  estado!: 'PENDIENTE' | 'EN_REVISION' | 'RESUELTA_CON_AJUSTE' | 'RESUELTA_SIN_AJUSTE';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;
}

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidenciaBitacoraDto {
  @IsString()
  @MaxLength(1000)
  descripcion!: string;

  @IsOptional()
  @IsIn(['OBSERVACION', 'CAMBIO_ESTADO', 'AJUSTE_STOCK', 'CIERRE'])
  accion?: 'OBSERVACION' | 'CAMBIO_ESTADO' | 'AJUSTE_STOCK' | 'CIERRE';

  @IsOptional()
  @IsIn(['PENDIENTE', 'EN_REVISION', 'RESUELTA_CON_AJUSTE', 'RESUELTA_SIN_AJUSTE'])
  estadoResultante?: 'PENDIENTE' | 'EN_REVISION' | 'RESUELTA_CON_AJUSTE' | 'RESUELTA_SIN_AJUSTE';
}

import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ResolverInconsistenciaConAjusteDto {
  @IsOptional()
  @IsUUID()
  ubicacionId?: string;

  @Type(() => Number)
  @IsNumber()
  cantidadAjuste!: number;

  @IsOptional()
  @IsIn(['FALTANTE', 'EXCEDENTE', 'DANIO', 'VENCIDO', 'OTRO'])
  categoria?: 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';

  @IsString()
  @MaxLength(500)
  motivo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;
}

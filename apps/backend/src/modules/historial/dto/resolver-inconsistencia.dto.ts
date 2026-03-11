import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength } from 'class-validator';

export class ResolverInconsistenciaDto {
  @Type(() => Number)
  @IsNumber()
  stockRealObservado!: number;

  @IsString()
  @MaxLength(500)
  motivoResolucion!: string;
}

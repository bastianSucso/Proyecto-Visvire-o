import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnularMovimientoFinancieroDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}

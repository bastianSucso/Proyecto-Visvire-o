import { IsDateString, IsIn, IsOptional } from 'class-validator';

export type PeriodoFinanciero = 'hoy' | 'semana' | 'mes';

export class ConsultarPeriodoFinancieroDto {
  @IsOptional()
  @IsIn(['hoy', 'semana', 'mes'])
  periodo?: PeriodoFinanciero;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListarPagosDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  trabajadorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  concepto?: string;
}

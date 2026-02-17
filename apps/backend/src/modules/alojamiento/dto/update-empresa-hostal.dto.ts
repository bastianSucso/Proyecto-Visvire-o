import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmpresaHostalDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  rutEmpresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombreEmpresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombreContratista?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  correoContratista?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fonoContratista?: string;
}

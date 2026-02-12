import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmpresaHostalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombreEmpresa: string;

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

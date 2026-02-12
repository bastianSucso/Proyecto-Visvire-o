import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateHuespedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombreCompleto: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsUUID('4')
  empresaHostalId?: string;
}

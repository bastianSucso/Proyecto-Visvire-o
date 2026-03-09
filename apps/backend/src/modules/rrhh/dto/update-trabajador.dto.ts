import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentoTipo } from '../entities/trabajador.entity';

export class UpdateTrabajadorDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidos?: string;

  @IsOptional()
  @IsEnum(DocumentoTipo)
  documentoTipo?: DocumentoTipo;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  documentoNumero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

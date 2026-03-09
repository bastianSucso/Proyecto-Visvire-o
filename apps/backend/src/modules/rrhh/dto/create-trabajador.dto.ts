import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentoTipo } from '../entities/trabajador.entity';

export class CreateTrabajadorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  apellidos!: string;

  @IsEnum(DocumentoTipo)
  documentoTipo!: DocumentoTipo;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  documentoNumero!: string;

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

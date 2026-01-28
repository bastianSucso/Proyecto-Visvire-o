import { IsOptional, IsUUID } from 'class-validator';

export class UpdateDocumentoDto {
  @IsOptional()
  @IsUUID()
  origenId?: string;

  @IsOptional()
  @IsUUID()
  destinoId?: string;
}

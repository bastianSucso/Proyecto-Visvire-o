import { IsUUID } from 'class-validator';

export class CreateDocumentoTraspasoDto {
  @IsUUID()
  origenId!: string;

  @IsUUID()
  destinoId!: string;
}

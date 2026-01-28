import { IsUUID } from 'class-validator';

export class CreateDocumentoIngresoDto {
  @IsUUID()
  destinoId!: string;
}

import { ArrayNotEmpty, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentoIngresoItemDto } from './documento-ingreso-item.dto';

export class CreateDocumentoIngresoDto {
  @IsUUID()
  destinoId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DocumentoIngresoItemDto)
  items!: DocumentoIngresoItemDto[];
}

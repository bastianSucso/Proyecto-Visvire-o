import { ArrayNotEmpty, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentoItemDto } from './documento-item.dto';

export class CreateDocumentoIngresoDto {
  @IsUUID()
  destinoId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DocumentoItemDto)
  items!: DocumentoItemDto[];
}

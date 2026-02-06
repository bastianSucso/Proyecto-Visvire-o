import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class DocumentoIngresoItemDto {
  @IsUUID()
  productoId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  costoIngreso!: number;
}

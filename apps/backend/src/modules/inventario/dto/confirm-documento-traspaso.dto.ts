import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConfirmTraspasoItemDto {
  @IsUUID()
  productoId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class ConfirmDocumentoTraspasoDto {
  @IsUUID()
  origenId!: string;

  @IsUUID()
  destinoId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmTraspasoItemDto)
  items!: ConfirmTraspasoItemDto[];
}

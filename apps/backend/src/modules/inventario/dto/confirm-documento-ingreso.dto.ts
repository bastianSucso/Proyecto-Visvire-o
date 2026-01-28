import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConfirmIngresoItemDto {
  @IsUUID()
  productoId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class ConfirmDocumentoIngresoDto {
  @IsUUID()
  destinoId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmIngresoItemDto)
  items!: ConfirmIngresoItemDto[];
}

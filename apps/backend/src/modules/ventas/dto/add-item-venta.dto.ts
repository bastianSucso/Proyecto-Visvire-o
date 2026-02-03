import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class AddItemVentaDto {
  @IsUUID()
  productoId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad!: number;
}

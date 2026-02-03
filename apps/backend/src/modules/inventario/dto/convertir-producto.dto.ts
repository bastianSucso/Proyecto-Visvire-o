import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class ConvertirProductoDto {
  @IsUUID()
  productoOrigenId!: string;

  @IsUUID()
  productoDestinoId!: string;

  @IsUUID()
  ubicacionId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidadOrigen!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  factor!: number;
}

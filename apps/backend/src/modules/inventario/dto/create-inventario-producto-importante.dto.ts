import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateInventarioProductoImportanteDto {
  @IsUUID()
  productoId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidadMinima!: number;
}

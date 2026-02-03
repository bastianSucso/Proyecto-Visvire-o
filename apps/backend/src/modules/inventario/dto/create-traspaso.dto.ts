import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateTraspasoDto {
  @IsUUID()
  productoId!: string;

  @IsUUID()
  origenId!: string;

  @IsUUID()
  destinoId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad!: number;
}

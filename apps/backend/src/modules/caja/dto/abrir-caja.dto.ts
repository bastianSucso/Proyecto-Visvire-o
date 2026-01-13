import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class AbrirCajaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoInicial!: number;
}

import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateInventarioSalaObjetivoDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  stockIdeal!: number;
}

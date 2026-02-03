import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateItemVentaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad!: number;
}

import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateConversionFactorDto {
  @IsUUID()
  productoOrigenId!: string;

  @IsUUID()
  productoDestinoId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  factor!: number;
}

import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateRecetaDto {
  @IsUUID()
  comidaId!: string;

  @IsUUID()
  grupoId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  cantidadBase!: number;
}

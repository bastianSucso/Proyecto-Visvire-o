import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateTraspasoDto {
  @IsUUID()
  productoId!: string;

  @IsUUID()
  origenId!: string;

  @IsUUID()
  destinoId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

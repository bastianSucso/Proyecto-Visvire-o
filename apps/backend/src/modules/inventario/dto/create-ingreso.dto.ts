import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateIngresoDto {
  @IsUUID()
  productoId!: string;

  @IsUUID()
  ubicacionId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

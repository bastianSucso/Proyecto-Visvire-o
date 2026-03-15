import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUnidadMedidaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nombre!: string;
}

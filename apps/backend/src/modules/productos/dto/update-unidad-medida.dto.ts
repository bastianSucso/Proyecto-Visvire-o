import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateUnidadMedidaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nombre!: string;
}

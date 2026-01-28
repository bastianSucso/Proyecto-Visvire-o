import { IsInt, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAjusteDto {
  @IsUUID()
  productoId!: string;

  @IsUUID()
  ubicacionId!: string;

  @IsInt()
  cantidad!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  motivo!: string;
}

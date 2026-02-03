import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAjusteDto {
  @IsUUID()
  productoId!: string;

  @IsUUID()
  ubicacionId!: string;

  @Type(() => Number)
  @IsNumber()
  cantidad!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  motivo!: string;
}

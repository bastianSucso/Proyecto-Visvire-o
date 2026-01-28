import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUbicacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsString()
  @IsIn(['BODEGA', 'SALA_VENTA'])
  tipo: 'BODEGA' | 'SALA_VENTA';
}

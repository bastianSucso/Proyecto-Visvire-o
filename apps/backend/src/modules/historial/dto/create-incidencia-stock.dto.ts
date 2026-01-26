import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsIn } from 'class-validator';

export class CreateIncidenciaStockDto {
  @IsNotEmpty()
  sesionCajaId!: number;

  @IsNotEmpty()
  productoId!: string;

  @IsIn(['FALTANTE', 'EXCEDENTE', 'DANIO', 'VENCIDO', 'OTRO'])
  tipo!: 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';

  @IsInt()
  @IsPositive()
  cantidad!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

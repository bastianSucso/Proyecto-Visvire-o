import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateIncidenciaStockDto {
  @IsNotEmpty()
  sesionCajaId!: number;

  @IsNotEmpty()
  productoId!: string;

  @IsIn(['FALTANTE', 'EXCEDENTE', 'DANIO', 'VENCIDO', 'OTRO'])
  tipo!: 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

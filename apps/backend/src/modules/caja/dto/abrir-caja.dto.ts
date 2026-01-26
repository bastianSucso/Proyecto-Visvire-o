import { IsNumber, Min, IsOptional } from 'class-validator';

export class AbrirCajaDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  cajaId?: number;

  @IsNumber()
  @Min(0)
  montoInicial!: number;
}

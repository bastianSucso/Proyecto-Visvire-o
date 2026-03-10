import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateIncidenciaStockDto } from './create-incidencia-stock.dto';

export class CreateInconsistenciaAdminDto extends CreateIncidenciaStockDto {
  @Type(() => Number)
  @IsNumber()
  stockTeorico!: number;

  @Type(() => Number)
  @IsNumber()
  stockRealObservado!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  costoUnitarioSnapshot?: number;
}

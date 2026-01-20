import { IsEnum } from 'class-validator';
import { MedioPago } from '../entities/venta.entity';

export class ConfirmarVentaDto {
  @IsEnum(MedioPago, { message: 'medioPago debe ser EFECTIVO o TARJETA' })
  medioPago!: MedioPago;
}

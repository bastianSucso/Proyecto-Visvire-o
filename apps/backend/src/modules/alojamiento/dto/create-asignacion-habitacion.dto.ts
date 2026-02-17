import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { MedioPago } from '../../ventas/entities/venta.entity';

export class CreateAsignacionHabitacionDto {
  @IsUUID('4')
  habitacionId: string;

  @IsUUID('4')
  huespedId: string;

  @IsInt()
  @Min(1)
  cantidadNoches: number;

  @IsOptional()
  @IsEnum(MedioPago, { message: 'medioPago debe ser EFECTIVO o TARJETA' })
  medioPago?: MedioPago;
}

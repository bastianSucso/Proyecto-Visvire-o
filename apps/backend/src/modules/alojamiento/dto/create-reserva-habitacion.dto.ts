import { IsISO8601, IsUUID } from 'class-validator';

export class CreateReservaHabitacionDto {
  @IsUUID('4')
  habitacionId: string;

  @IsUUID('4')
  huespedId: string;

  @IsISO8601({ strict: true })
  fechaIngreso: string;

  @IsISO8601({ strict: true })
  fechaSalidaEstimada: string;
}

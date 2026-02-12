import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAsignacionHabitacionDto {
  @IsUUID('4')
  habitacionId: string;

  @IsUUID('4')
  huespedId: string;

  @IsNotEmpty()
  @IsDateString()
  fechaIngreso: string;

  @IsNotEmpty()
  @IsDateString()
  fechaSalidaEstimada: string;
}

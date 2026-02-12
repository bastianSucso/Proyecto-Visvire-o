import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateAsignacionHabitacionDto {
  @IsUUID('4')
  habitacionId: string;

  @IsUUID('4')
  huespedId: string;

  @IsInt()
  @Min(1)
  cantidadNoches: number;
}

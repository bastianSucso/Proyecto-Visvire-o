import { IsString, MinLength } from 'class-validator';

export class CancelReservaHabitacionDto {
  @IsString()
  @MinLength(3)
  motivoCancelacion: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnularPagoPersonalDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}

import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUbicacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCajaDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

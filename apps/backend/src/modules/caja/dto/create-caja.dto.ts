import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCajaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  numero!: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

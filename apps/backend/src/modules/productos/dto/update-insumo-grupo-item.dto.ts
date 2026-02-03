import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInsumoGrupoItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

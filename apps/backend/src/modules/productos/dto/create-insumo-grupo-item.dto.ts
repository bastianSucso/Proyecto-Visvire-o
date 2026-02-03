import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateInsumoGrupoItemDto {
  @IsUUID()
  productoId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;
}

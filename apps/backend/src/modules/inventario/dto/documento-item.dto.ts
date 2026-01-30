import { IsInt, IsUUID, Min } from 'class-validator';

export class DocumentoItemDto {
  @IsUUID()
  productoId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

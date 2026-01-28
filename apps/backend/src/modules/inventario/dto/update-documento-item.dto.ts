import { IsInt, Min } from 'class-validator';

export class UpdateDocumentoItemDto {
  @IsInt()
  @Min(1)
  cantidad!: number;
}

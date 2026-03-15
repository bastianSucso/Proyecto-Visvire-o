import { IsBoolean } from 'class-validator';

export class SetUnidadMedidaActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

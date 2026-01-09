import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'VENDEDOR'])
  role?: 'ADMIN' | 'VENDEDOR';

  @IsOptional()
  isActive?: boolean;
}

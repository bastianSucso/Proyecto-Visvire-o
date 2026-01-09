import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsIn(['ADMIN', 'VENDEDOR'])
  role: 'ADMIN' | 'VENDEDOR';
}

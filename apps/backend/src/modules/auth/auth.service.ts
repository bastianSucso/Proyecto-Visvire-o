import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly usersRepo: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.usersRepo.findOne({
      where: [{ email: normalizedEmail }],
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.isActive) throw new ForbiddenException('Usuario deshabilitado');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.idUsuario, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: { idUsuario: user.idUsuario, email: user.email, role: user.role },
    };
  }
}

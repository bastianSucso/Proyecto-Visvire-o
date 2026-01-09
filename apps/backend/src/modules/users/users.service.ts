import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly repo: Repository<UserEntity>,
  ) {}

  async list() {
    const users = await this.repo.find({ order: { createdAt: 'DESC' } });
    // nunca devolver hash
    return users.map(({ passwordHash, ...u }) => u);
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const exists = await this.repo.findOne({ where: { email } });
    if (exists) throw new BadRequestException('El correo ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.repo.create({
      email,
      nombre: dto.nombre?.trim(),
      apellido: dto.apellido?.trim(),
      role: dto.role,
      passwordHash,
      isActive: true,
    });

    const saved = await this.repo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== user.email) {
        const exists = await this.repo.findOne({ where: { email } });
        if (exists) throw new BadRequestException('El correo ya está registrado');
      }
      user.email = email;
    }

    if (dto.nombre !== undefined) user.nombre = dto.nombre?.trim();
    if (dto.apellido !== undefined) user.apellido = dto.apellido?.trim();
    if (dto.role) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.repo.save(user);
    const { passwordHash, ...safe } = saved;
    return safe;
  }

  async setActive(id: string, isActive: boolean) {
    return this.update(id, { isActive });
  }

  async remove(id: string): Promise<void> {
  const user = await this.repo.findOne({ where: { id } });
  if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.repo.delete(id);
  }
}

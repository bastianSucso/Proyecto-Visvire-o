import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { typeOrmConfig } from './typeorm.config';
import { UserEntity } from '../modules/users/entities/user.entity';

async function seedAdmin() {
  const ds = new DataSource(typeOrmConfig());
  await ds.initialize();

  const repo = ds.getRepository(UserEntity);

  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const pass = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';

  if (!email || !pass) {
    console.error('Faltan BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD en el .env');
    process.exit(1);
  }

  const exists = await repo.findOne({ where: { email } });
  if (exists) {
    console.log('Admin ya existe:', email);
    await ds.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(pass, 10);

  const admin = repo.create({
    email,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
    nombre: 'Admin',
    apellido: 'Sistema',
  });

  await repo.save(admin);

  console.log('Admin creado:', email);
  await ds.destroy();
}

seedAdmin().catch((e) => {
  console.error(e);
  process.exit(1);
});

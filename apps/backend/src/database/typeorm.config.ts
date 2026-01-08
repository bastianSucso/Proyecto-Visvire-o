import { DataSourceOptions } from 'typeorm';

export function typeOrmConfig(): DataSourceOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,

    // En producción normalmente usas migraciones, no sync
    synchronize: !isProd, // dev true, prod false
    logging: !isProd,

    // Vamos a buscar entidades en tus módulos
    entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],

    // Migraciones (luego las usamos de verdad)
    migrations: [__dirname + '/migrations/*{.ts,.js}'],

    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

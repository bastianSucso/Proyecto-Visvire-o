import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';

async function seedCatalogos() {
  const ds = new DataSource(typeOrmConfig());
  await ds.initialize();

  try {
    await ds.query(`
      INSERT INTO "unidad_medida" ("nombre", "nombre_normalizado")
      VALUES
        ('g', 'g'),
        ('kg', 'kg'),
        ('ml', 'ml'),
        ('l', 'l'),
        ('unidad', 'unidad'),
        ('pack', 'pack')
      ON CONFLICT ("nombre_normalizado") DO NOTHING
    `);

    await ds.query(`
      INSERT INTO "inconsistencia_categoria" ("codigo", "nombre", "descripcion", "activa", "es_sistema", "orden")
      VALUES
        ('FALTANTE', 'Faltante', NULL, true, true, 1),
        ('DANADO', 'Dañado', NULL, true, true, 2),
        ('VENCIDO', 'Vencido', NULL, true, true, 3),
        ('OTRO', 'Otro', NULL, true, true, 4)
      ON CONFLICT ("codigo") DO NOTHING
    `);

    console.log('Catalogos base verificados (idempotente).');
  } finally {
    await ds.destroy();
  }
}

seedCatalogos().catch((e) => {
  console.error(e);
  process.exit(1);
});

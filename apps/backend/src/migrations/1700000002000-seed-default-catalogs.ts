import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultCatalogs1700000002000 implements MigrationInterface {
  name = 'SeedDefaultCatalogs1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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

    await queryRunner.query(`
      INSERT INTO "inconsistencia_categoria" ("codigo", "nombre", "descripcion", "activa", "es_sistema", "orden")
      VALUES
        ('FALTANTE', 'Faltante', NULL, true, true, 1),
        ('DANADO', 'Dañado', NULL, true, true, 2),
        ('VENCIDO', 'Vencido', NULL, true, true, 3),
        ('OTRO', 'Otro', NULL, true, true, 4)
      ON CONFLICT ("codigo") DO NOTHING
    `);
  }

  public async down(): Promise<void> {
    // no-op: esta migracion agrega datos base y no debe borrar datos de negocio
  }
}

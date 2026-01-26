import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueOpenSession1700000000000 implements MigrationInterface {
  name = 'AddUniqueOpenSession1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Un índice único parcial: (id_caja) solo cuando estado = 'ABIERTA'
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_sesion_caja_una_abierta_por_caja"
      ON "sesion_caja" ("id_caja")
      WHERE "estado" = 'ABIERTA'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_sesion_caja_una_abierta_por_caja"
    `);
  }
}

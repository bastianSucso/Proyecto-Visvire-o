import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentToRoomStateChange1700000001000 implements MigrationInterface {
  name = 'AddAssignmentToRoomStateChange1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "habitacion_estado_cambio"
      ADD COLUMN IF NOT EXISTS "id_asignacion_habitacion" uuid NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_habitacion_estado_cambio_asignacion"
      ON "habitacion_estado_cambio" ("id_asignacion_habitacion")
    `);

    await queryRunner.query(`
      ALTER TABLE "habitacion_estado_cambio"
      ADD CONSTRAINT "fk_habitacion_estado_cambio_asignacion"
      FOREIGN KEY ("id_asignacion_habitacion")
      REFERENCES "asignacion_habitacion"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "habitacion_estado_cambio"
      DROP CONSTRAINT IF EXISTS "fk_habitacion_estado_cambio_asignacion"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_habitacion_estado_cambio_asignacion"
    `);

    await queryRunner.query(`
      ALTER TABLE "habitacion_estado_cambio"
      DROP COLUMN IF EXISTS "id_asignacion_habitacion"
    `);
  }
}

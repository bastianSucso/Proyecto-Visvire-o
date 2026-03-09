import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PagoPersonalEntity } from './pago-personal.entity';

export enum TrabajadorEstado {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export enum DocumentoTipo {
  RUT = 'RUT',
  PASAPORTE = 'PASAPORTE',
  OTRO = 'OTRO',
}

@Entity('rrhh_trabajador')
@Index('ux_rrhh_trabajador_documento', ['documentoTipo', 'documentoNumero'], { unique: true })
@Index('ix_rrhh_trabajador_estado', ['estado'])
export class TrabajadorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  nombres!: string;

  @Column({ type: 'varchar', length: 120 })
  apellidos!: string;

  @Column({ type: 'enum', enum: DocumentoTipo, name: 'documento_tipo' })
  documentoTipo!: DocumentoTipo;

  @Column({ type: 'varchar', length: 40, name: 'documento_numero' })
  documentoNumero!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  cargo!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacion!: string | null;

  @Column({ type: 'enum', enum: TrabajadorEstado, default: TrabajadorEstado.ACTIVO })
  estado!: TrabajadorEstado;

  @Column({ type: 'varchar', length: 64, name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'updated_by_user_id', nullable: true })
  updatedByUserId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PagoPersonalEntity, (pago) => pago.trabajador)
  pagos!: PagoPersonalEntity[];
}

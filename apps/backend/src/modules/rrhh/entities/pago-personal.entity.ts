import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MovimientoFinancieroMetodoPago } from '../../finanzas/entities/movimiento-financiero.entity';
import { PagoPersonalCambioEntity } from './pago-personal-cambio.entity';
import { TrabajadorEntity } from './trabajador.entity';

export enum PagoPersonalEstado {
  ACTIVO = 'ACTIVO',
  ANULADO = 'ANULADO',
}

@Entity('rrhh_pago_personal')
@Index('ix_rrhh_pago_personal_fecha_pago', ['fechaPago'])
@Index('ix_rrhh_pago_personal_concepto', ['concepto'])
@Index('ix_rrhh_pago_personal_estado', ['estado'])
export class PagoPersonalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TrabajadorEntity, (trabajador) => trabajador.pagos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador!: TrabajadorEntity;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  monto!: string;

  @Column({ type: 'char', length: 3, default: 'CLP' })
  moneda!: string;

  @Column({ type: 'timestamptz', name: 'fecha_pago' })
  fechaPago!: Date;

  @Column({ type: 'varchar', length: 80 })
  concepto!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({
    type: 'enum',
    enum: MovimientoFinancieroMetodoPago,
    name: 'metodo_pago',
    nullable: true,
  })
  metodoPago!: MovimientoFinancieroMetodoPago | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  referencia!: string | null;

  @Column({ type: 'varchar', length: 500, name: 'adjunto_url', nullable: true })
  adjuntoUrl!: string | null;

  @Column({ type: 'enum', enum: PagoPersonalEstado, default: PagoPersonalEstado.ACTIVO })
  estado!: PagoPersonalEstado;

  @Column({ type: 'varchar', length: 64, name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'updated_by_user_id', nullable: true })
  updatedByUserId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PagoPersonalCambioEntity, (cambio) => cambio.pago)
  cambios!: PagoPersonalCambioEntity[];
}

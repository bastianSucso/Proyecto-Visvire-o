import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum MovimientoFinancieroTipo {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

export enum MovimientoFinancieroOrigenTipo {
  EXTERNO_MANUAL = 'EXTERNO_MANUAL',
  VENTA_POS = 'VENTA_POS',
  VENTA_ALOJAMIENTO = 'VENTA_ALOJAMIENTO',
  EGRESO_MANUAL = 'EGRESO_MANUAL',
  INVENTARIO_INGRESO = 'INVENTARIO_INGRESO',
  RRHH_PAGO = 'RRHH_PAGO',
}

export enum MovimientoFinancieroEstado {
  ACTIVO = 'ACTIVO',
  ANULADO = 'ANULADO',
}

export enum MovimientoFinancieroMetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  OTRO = 'OTRO',
}

@Entity('movimiento_financiero')
@Index('ux_movimiento_financiero_origen_unico', ['origenTipo', 'origenId'], {
  unique: true,
  where: '"origen_id" IS NOT NULL',
})
@Index('ix_movimiento_financiero_fecha', ['fechaMovimiento'])
@Index('ix_movimiento_financiero_tipo', ['tipo'])
@Index('ix_movimiento_financiero_categoria', ['categoria'])
@Index('ix_movimiento_financiero_estado', ['estado'])
export class MovimientoFinancieroEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: MovimientoFinancieroTipo })
  tipo!: MovimientoFinancieroTipo;

  @Column({ type: 'enum', enum: MovimientoFinancieroOrigenTipo, name: 'origen_tipo' })
  origenTipo!: MovimientoFinancieroOrigenTipo;

  @Column({ type: 'varchar', length: 64, name: 'origen_id', nullable: true })
  origenId!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  monto!: string;

  @Column({ type: 'char', length: 3, default: 'CLP' })
  moneda!: string;

  @Column({ type: 'varchar', length: 50 })
  categoria!: string;

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

  @Column({ type: 'timestamptz', name: 'fecha_movimiento' })
  fechaMovimiento!: Date;

  @Column({ type: 'boolean', name: 'aplica_credito_fiscal', nullable: true })
  aplicaCreditoFiscal!: boolean | null;

  @Column({ type: 'numeric', precision: 5, scale: 4, name: 'iva_tasa', default: '0.1900' })
  ivaTasa!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: MovimientoFinancieroEstado, default: MovimientoFinancieroEstado.ACTIVO })
  estado!: MovimientoFinancieroEstado;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: UserEntity | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', name: 'anulado_at', nullable: true })
  anuladoAt!: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'anulado_by' })
  anuladoBy!: UserEntity | null;

  @Column({ type: 'varchar', length: 300, name: 'anulado_motivo', nullable: true })
  anuladoMotivo!: string | null;
}

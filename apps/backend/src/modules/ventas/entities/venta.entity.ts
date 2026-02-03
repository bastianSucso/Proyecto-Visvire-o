import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SesionCajaEntity } from '../../historial/entities/sesion-caja.entity';
import { VentaItemEntity } from './venta-item.entity';

export enum VentaEstado {
  EN_EDICION = 'EN_EDICION',
  CONFIRMADA = 'CONFIRMADA',
  ANULADA = 'ANULADA',
}

export enum MedioPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
}

@Entity('venta')
export class VentaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_venta' })
  idVenta!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fechaCreacion!: Date;

  @Column({ type: 'enum', enum: VentaEstado, default: VentaEstado.EN_EDICION })
  estado!: VentaEstado;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'total_venta' })
  totalVenta!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, name: 'cantidad_total' })
  cantidadTotal!: string;

  @Column({ type: 'timestamptz', name: 'fecha_confirmacion', nullable: true })
  fechaConfirmacion!: Date | null;

  @Column({ type: 'enum', enum: MedioPago, name: 'medio_pago', nullable: true })
  medioPago!: MedioPago | null;

  @ManyToOne(() => SesionCajaEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sesioncaja' }) 
  sesionCaja!: SesionCajaEntity;

  @OneToMany(() => VentaItemEntity, (it) => it.venta, { cascade: false })
  items!: VentaItemEntity[];
}

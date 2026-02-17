import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AsignacionHabitacionEntity } from './asignacion-habitacion.entity';
import { SesionCajaEntity } from '../../historial/entities/sesion-caja.entity';
import { MedioPago } from '../../ventas/entities/venta.entity';

export enum VentaAlojamientoEstado {
  CONFIRMADA = 'CONFIRMADA',
}

@Entity('venta_alojamiento')
@Index('ux_venta_alojamiento_asignacion', ['asignacion'], { unique: true })
@Index('ix_venta_alojamiento_sesion', ['sesionCaja'])
export class VentaAlojamientoEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_venta_alojamiento' })
  id: number;

  @OneToOne(() => AsignacionHabitacionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_asignacion_habitacion' })
  asignacion: AsignacionHabitacionEntity;

  @ManyToOne(() => SesionCajaEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sesion_caja' })
  sesionCaja: SesionCajaEntity;

  @Column({ type: 'enum', enum: MedioPago, name: 'medio_pago' })
  medioPago: MedioPago;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'monto_total' })
  montoTotal: string;

  @Column({ type: 'enum', enum: VentaAlojamientoEstado, default: VentaAlojamientoEstado.CONFIRMADA })
  estado: VentaAlojamientoEstado;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_confirmacion' })
  fechaConfirmacion: Date;
}

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
import { HabitacionEntity } from './habitacion.entity';
import { HuespedEntity } from './huesped.entity';

export enum ReservaHabitacionEstado {
  ACTIVA = 'ACTIVA',
  CANCELADA = 'CANCELADA',
  ATENDIDA = 'ATENDIDA',
}

@Entity('reserva_habitacion')
@Index('ix_reserva_habitacion_fechas', ['habitacion', 'fechaIngreso', 'fechaSalidaEstimada'])
@Index('ix_reserva_habitacion_huesped', ['huesped'])
export class ReservaHabitacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => HabitacionEntity, (h) => h.reservas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion: HabitacionEntity;

  @ManyToOne(() => HuespedEntity, (h) => h.reservas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_huesped' })
  huesped: HuespedEntity;

  @Column({ type: 'timestamptz', name: 'fecha_ingreso' })
  fechaIngreso: Date;

  @Column({ type: 'timestamptz', name: 'fecha_salida_estimada' })
  fechaSalidaEstimada: Date;

  @Column({
    type: 'enum',
    enum: ReservaHabitacionEstado,
    default: ReservaHabitacionEstado.ACTIVA,
  })
  estado: ReservaHabitacionEstado;

  @Column({ type: 'text', name: 'motivo_cancelacion', nullable: true })
  motivoCancelacion: string | null;

  @Column({ type: 'timestamptz', name: 'fecha_cancelacion', nullable: true })
  fechaCancelacion: Date | null;

  @Column({ type: 'timestamptz', name: 'fecha_atencion', nullable: true })
  fechaAtencion: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'fecha_actualizacion' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HabitacionEntity } from './habitacion.entity';
import { AsignacionHabitacionEntity } from './asignacion-habitacion.entity';

export enum HabitacionEstadoTimeline {
  INACTIVA = 'INACTIVA',
  DISPONIBLE = 'DISPONIBLE',
  OCUPADA = 'OCUPADA',
  EN_LIMPIEZA = 'EN_LIMPIEZA',
}

export enum HabitacionEstadoCambioAccion {
  ASIGNACION_CREADA = 'ASIGNACION_CREADA',
  CHECKOUT_MANUAL = 'CHECKOUT_MANUAL',
  CHECKOUT_AUTOMATICO = 'CHECKOUT_AUTOMATICO',
  LIMPIEZA_FINALIZADA = 'LIMPIEZA_FINALIZADA',
  HABITACION_ACTIVADA = 'HABITACION_ACTIVADA',
  HABITACION_INACTIVADA = 'HABITACION_INACTIVADA',
  ESTADO_OPERATIVO_ACTUALIZADO = 'ESTADO_OPERATIVO_ACTUALIZADO',
}

@Entity('habitacion_estado_cambio')
@Index('ix_habitacion_estado_cambio_created', ['createdAt'])
@Index('ix_habitacion_estado_cambio_room', ['habitacion', 'createdAt'])
@Index('ix_habitacion_estado_cambio_asignacion', ['asignacion'])
export class HabitacionEstadoCambioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => HabitacionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion: HabitacionEntity;

  @ManyToOne(() => AsignacionHabitacionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_asignacion_habitacion' })
  asignacion: AsignacionHabitacionEntity | null;

  @Column({
    type: 'enum',
    enum: HabitacionEstadoTimeline,
    name: 'estado_anterior',
  })
  estadoAnterior: HabitacionEstadoTimeline;

  @Column({
    type: 'enum',
    enum: HabitacionEstadoTimeline,
    name: 'estado_nuevo',
  })
  estadoNuevo: HabitacionEstadoTimeline;

  @Column({
    type: 'enum',
    enum: HabitacionEstadoCambioAccion,
    name: 'accion',
  })
  accion: HabitacionEstadoCambioAccion;

  @Column({ type: 'varchar', length: 80, name: 'actor_user_id', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  createdAt: Date;
}

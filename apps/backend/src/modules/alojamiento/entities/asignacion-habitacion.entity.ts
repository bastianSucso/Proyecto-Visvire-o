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
import { HuespedEntity } from './huesped.entity';
import { SesionCajaEntity } from '../../historial/entities/sesion-caja.entity';

export enum AsignacionEstado {
  ACTIVA = 'ACTIVA',
  FINALIZADA = 'FINALIZADA',
}

export enum AsignacionTipoCobro {
  DIRECTO = 'DIRECTO',
  EMPRESA_CONVENIO = 'EMPRESA_CONVENIO',
}

@Entity('asignacion_habitacion')
@Index('ix_asignacion_habitacion_fechas', ['habitacion', 'fechaIngreso', 'fechaSalidaEstimada'])
@Index('ix_asignacion_habitacion_huesped', ['huesped'])
export class AsignacionHabitacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => HabitacionEntity, (h) => h.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion!: HabitacionEntity;

  @ManyToOne(() => HuespedEntity, (h) => h.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_huesped' })
  huesped!: HuespedEntity;

  @ManyToOne(() => SesionCajaEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sesion_apertura' })
  sesionApertura!: SesionCajaEntity;

  @Column({ type: 'timestamp', name: 'fecha_ingreso' })
  fechaIngreso!: Date;

  @Column({ type: 'timestamp', name: 'fecha_salida_estimada' })
  fechaSalidaEstimada!: Date;

  @Column({
    type: 'enum',
    enum: AsignacionEstado,
    default: AsignacionEstado.ACTIVA,
  })
  estado: AsignacionEstado;

  @Column({
    type: 'enum',
    enum: AsignacionTipoCobro,
    name: 'tipo_cobro',
    default: AsignacionTipoCobro.DIRECTO,
  })
  tipoCobro: AsignacionTipoCobro;

  @Column({ type: 'timestamp', name: 'fecha_salida_real', nullable: true })
  fechaSalidaReal: Date | null;

  @ManyToOne(() => SesionCajaEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'id_sesion_checkout' })
  sesionCheckout: SesionCajaEntity | null;

  @Column({ type: 'int' })
  noches: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;
}

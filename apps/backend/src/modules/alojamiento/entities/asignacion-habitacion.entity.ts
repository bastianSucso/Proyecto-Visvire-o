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
import { UserEntity } from '../../users/entities/user.entity';

@Entity('asignacion_habitacion')
@Index('ix_asignacion_habitacion_fechas', ['habitacion', 'fechaIngreso', 'fechaSalidaEstimada'])
@Index('ix_asignacion_habitacion_huesped', ['huesped'])
export class AsignacionHabitacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => HabitacionEntity, (h) => h.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion: HabitacionEntity;

  @ManyToOne(() => HuespedEntity, (h) => h.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_huesped' })
  huesped: HuespedEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_vendedor' })
  vendedor: UserEntity;

  @Column({ type: 'timestamp', name: 'fecha_ingreso' })
  fechaIngreso: Date;

  @Column({ type: 'timestamp', name: 'fecha_salida_estimada' })
  fechaSalidaEstimada: Date;

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;
}

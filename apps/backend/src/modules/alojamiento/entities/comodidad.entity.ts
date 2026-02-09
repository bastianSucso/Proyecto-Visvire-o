import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HabitacionEntity } from './habitacion.entity';

@Entity('comodidad')
export class ComodidadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  updatedAt: Date;

  @ManyToMany(() => HabitacionEntity, (h) => h.comodidades)
  habitaciones: HabitacionEntity[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HabitacionEntity } from './habitacion.entity';

@Entity('cama')
export class CamaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  item: string;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @ManyToOne(() => HabitacionEntity, (h) => h.camas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion: HabitacionEntity;

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  updatedAt: Date;
}

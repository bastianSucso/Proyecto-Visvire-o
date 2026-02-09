import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { HabitacionEntity } from './habitacion.entity';

@Entity('inventario_habitacion')
export class InventarioHabitacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  item: string;

  @Column({ type: 'int', default: 0 })
  cantidad: number;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @ManyToOne(() => HabitacionEntity, (h) => h.inventarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion: HabitacionEntity;

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  updatedAt: Date;
}

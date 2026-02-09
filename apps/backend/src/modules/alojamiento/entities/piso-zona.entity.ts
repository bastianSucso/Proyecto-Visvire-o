import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HabitacionEntity } from './habitacion.entity';

@Entity('piso_zona')
export class PisoZonaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({ type: 'int', default: 1 })
  orden: number;

  @Column({ type: 'int', name: 'ancho_lienzo', default: 1400 })
  anchoLienzo: number;

  @Column({ type: 'int', name: 'alto_lienzo', default: 900 })
  altoLienzo: number;

  @Column({ type: 'int', name: 'tamano_cuadricula', default: 20 })
  tamanoCuadricula: number;

  @Column({ type: 'boolean', name: 'snap_activo', default: true })
  snapActivo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  updatedAt: Date;

  @OneToMany(() => HabitacionEntity, (h) => h.pisoZona)
  habitaciones: HabitacionEntity[];
}

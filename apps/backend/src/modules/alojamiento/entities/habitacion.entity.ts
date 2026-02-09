import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PisoZonaEntity } from './piso-zona.entity';
import { CamaEntity } from './cama.entity';
import { ComodidadEntity } from './comodidad.entity';
import { InventarioHabitacionEntity } from './inventario-habitacion.entity';

@Entity('habitacion')
@Unique('ux_habitacion_identificador_piso', ['identificador', 'pisoZona'])
export class HabitacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  identificador: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precio: string;

  @Column({ type: 'boolean', name: 'estado_activo', default: true })
  estadoActivo: boolean;

  @Column({ type: 'int', name: 'pos_x' })
  posX: number;

  @Column({ type: 'int', name: 'pos_y' })
  posY: number;

  @Column({ type: 'int' })
  ancho: number;

  @Column({ type: 'int' })
  alto: number;

  @ManyToOne(() => PisoZonaEntity, (p) => p.habitaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_piso_zona' })
  pisoZona: PisoZonaEntity;

  @OneToMany(() => CamaEntity, (c) => c.habitacion)
  camas: CamaEntity[];

  @ManyToMany(() => ComodidadEntity, (c) => c.habitaciones)
  @JoinTable({
    name: 'habitacion_comodidad',
    joinColumn: { name: 'id_habitacion', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'id_comodidad', referencedColumnName: 'id' },
  })
  comodidades: ComodidadEntity[];

  @OneToMany(() => InventarioHabitacionEntity, (i) => i.habitacion)
  inventarios: InventarioHabitacionEntity[];

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { EmpresaHostalEntity } from './empresa-hostal.entity';
import { AsignacionHabitacionEntity } from './asignacion-habitacion.entity';

@Entity('huesped')
@Index('ux_huesped_rut_unq', ['rut'], { unique: true, where: '"rut" IS NOT NULL' })
export class HuespedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, name: 'nombre_completo' })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  correo: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rut: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @ManyToOne(() => EmpresaHostalEntity, (e) => e.huespedes, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_empresa_hostal' })
  empresaHostal: EmpresaHostalEntity | null;

  @OneToMany(() => AsignacionHabitacionEntity, (a) => a.huesped)
  asignaciones: AsignacionHabitacionEntity[];

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  updatedAt: Date;
}

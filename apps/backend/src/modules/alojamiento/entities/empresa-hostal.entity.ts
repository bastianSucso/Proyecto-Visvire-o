import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HuespedEntity } from './huesped.entity';

@Entity('empresa_hostal')
@Index('ux_empresa_hostal_rut_empresa', ['rutEmpresa'], { unique: true })
export class EmpresaHostalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, name: 'rut_empresa' })
  rutEmpresa: string;

  @Column({ type: 'varchar', length: 120, name: 'nombre_empresa' })
  nombreEmpresa: string;

  @Column({ type: 'varchar', length: 120, name: 'nombre_contratista', nullable: true })
  nombreContratista: string | null;

  @Column({ type: 'varchar', length: 160, name: 'correo_contratista', nullable: true })
  correoContratista: string | null;

  @Column({ type: 'varchar', length: 30, name: 'fono_contratista', nullable: true })
  fonoContratista: string | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  updatedAt: Date;

  @OneToMany(() => HuespedEntity, (h) => h.empresaHostal)
  huespedes: HuespedEntity[];
}

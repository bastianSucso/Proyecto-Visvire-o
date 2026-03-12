import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncidenciaStockEntity } from './incidencia-stock.entity';
import { IncidenciaResolucionAdminEntity } from './incidencia-resolucion-admin.entity';

@Entity('inconsistencia_categoria')
export class InconsistenciaCategoriaEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_inconsistencia_categoria' })
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 80 })
  nombre!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'boolean', default: true })
  activa!: boolean;

  @Column({ type: 'boolean', name: 'es_sistema', default: false })
  esSistema!: boolean;

  @Column({ type: 'smallint', default: 0 })
  orden!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => IncidenciaStockEntity, (incidencia) => incidencia.categoria)
  incidencias!: IncidenciaStockEntity[];

  @OneToMany(() => IncidenciaResolucionAdminEntity, (resolucion) => resolucion.categoria)
  resoluciones!: IncidenciaResolucionAdminEntity[];
}

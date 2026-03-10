import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidenciaRevisionAdminEntity, IncidenciaRevisionEstado } from './incidencia-revision-admin.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type IncidenciaRevisionAccion =
  | 'OBSERVACION'
  | 'CAMBIO_ESTADO'
  | 'AJUSTE_STOCK'
  | 'CIERRE';

@Entity('incidencia_revision_bitacora')
export class IncidenciaRevisionBitacoraEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_incidencia_revision_bitacora' })
  id!: number;

  @ManyToOne(() => IncidenciaRevisionAdminEntity, (revision) => revision.bitacora, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_incidencia_revision_admin' })
  revision!: IncidenciaRevisionAdminEntity;

  @Column({ type: 'varchar', length: 20 })
  accion!: IncidenciaRevisionAccion;

  @Column({ type: 'varchar', length: 1000 })
  descripcion!: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_resultante', nullable: true })
  estadoResultante!: IncidenciaRevisionEstado | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_admin_autor' })
  adminAutor!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

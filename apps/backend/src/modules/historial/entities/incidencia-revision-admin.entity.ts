import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncidenciaStockEntity } from './incidencia-stock.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { AlteraEntity } from '../../inventario/entities/altera.entity';
import { IncidenciaRevisionBitacoraEntity } from './incidencia-revision-bitacora.entity';

export type IncidenciaRevisionEstado =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'RESUELTA_CON_AJUSTE'
  | 'RESUELTA_SIN_AJUSTE';

@Entity('incidencia_revision_admin')
export class IncidenciaRevisionAdminEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_incidencia_revision_admin' })
  id!: number;

  @OneToOne(() => IncidenciaStockEntity, (incidencia) => incidencia.revisionAdmin, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_incidencia_stock' })
  incidencia!: IncidenciaStockEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'stock_teorico' })
  stockTeorico!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'stock_real_observado' })
  stockRealObservado!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'diferencia' })
  diferencia!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'costo_unitario_snapshot' })
  costoUnitarioSnapshot!: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  estado!: IncidenciaRevisionEstado;

  @ManyToOne(() => AlteraEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_ajuste_aplicado' })
  ajusteAplicado!: AlteraEntity | null;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_admin_autor' })
  adminAutor!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_admin_resuelve' })
  adminResuelve!: UserEntity | null;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => IncidenciaRevisionBitacoraEntity, (bitacora) => bitacora.revision)
  bitacora!: IncidenciaRevisionBitacoraEntity[];
}

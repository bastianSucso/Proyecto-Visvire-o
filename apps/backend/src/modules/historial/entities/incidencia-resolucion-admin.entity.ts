import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncidenciaStockEntity } from './incidencia-stock.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { AlteraEntity } from '../../inventario/entities/altera.entity';
import { InconsistenciaCategoriaEntity } from './inconsistencia-categoria.entity';

export type IncidenciaResolucionEstadoFinal = 'RESUELTA_CON_AJUSTE' | 'RESUELTA_SIN_AJUSTE';

@Entity('incidencia_resolucion_admin')
export class IncidenciaResolucionAdminEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_incidencia_resolucion_admin' })
  id!: number;

  @OneToOne(() => IncidenciaStockEntity, (incidencia) => incidencia.resolucionAdmin, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_incidencia_stock' })
  incidencia!: IncidenciaStockEntity;

  @Column({ type: 'varchar', length: 30, name: 'estado_final' })
  estadoFinal!: IncidenciaResolucionEstadoFinal;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'stock_teorico' })
  stockTeorico!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'stock_real_observado' })
  stockRealObservado!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'diferencia' })
  diferencia!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'precio_costo_snapshot', default: '0.00' })
  precioCostoSnapshot!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'monto_perdida_snapshot', default: '0.00' })
  montoPerdidaSnapshot!: string;

  @Column({ type: 'varchar', length: 3, default: 'CLP' })
  moneda!: string;

  @ManyToOne(() => InconsistenciaCategoriaEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_inconsistencia_categoria' })
  categoria!: InconsistenciaCategoriaEntity;

  @Column({ type: 'varchar', length: 500, name: 'motivo_resolucion' })
  motivoResolucion!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_admin_resuelve' })
  adminResuelve!: UserEntity;

  @OneToOne(() => AlteraEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_ajuste_aplicado' })
  ajusteAplicado!: AlteraEntity | null;

  @Column({ type: 'timestamptz', name: 'resolved_at' })
  resolvedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

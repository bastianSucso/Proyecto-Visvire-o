import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ProductoEntity } from '../../productos/entities/producto.entity';
import { UbicacionEntity } from '../../ubicaciones/entities/ubicacion.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { VentaEntity } from '../../ventas/entities/venta.entity';

export type AlteraTipo =
  | 'INGRESO'
  | 'AJUSTE'
  | 'SALIDA'
  | 'TRASPASO'
  | 'CONVERSION_PRODUCTO';

@Entity('altera')
export class AlteraEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_altera' })
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  tipo!: AlteraTipo;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  cantidad!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  unidad!: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 6, name: 'factor_a_base', nullable: true })
  factorABase!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo!: string | null;

  @Column({ type: 'uuid', name: 'documento_ref', nullable: true })
  documentoRef!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha' })
  fecha!: Date;

  @ManyToOne(() => ProductoEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @ManyToOne(() => UbicacionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_ubicacion' })
  ubicacion!: UbicacionEntity | null;

  @ManyToOne(() => UbicacionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_origen' })
  origen!: UbicacionEntity | null;

  @ManyToOne(() => UbicacionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_destino' })
  destino!: UbicacionEntity | null;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @ManyToOne(() => VentaEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_venta' })
  venta!: VentaEntity | null;
}

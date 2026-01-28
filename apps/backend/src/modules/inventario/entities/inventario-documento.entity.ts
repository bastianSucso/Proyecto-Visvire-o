import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { UbicacionEntity } from '../../ubicaciones/entities/ubicacion.entity';
import { InventarioDocumentoItemEntity } from './inventario-documento-item.entity';

export type InventarioDocumentoTipo = 'INGRESO' | 'TRASPASO';
export type InventarioDocumentoEstado = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';

@Entity('inventario_documento')
export class InventarioDocumentoEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_documento' })
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  tipo!: InventarioDocumentoTipo;

  @Column({ type: 'varchar', length: 20 })
  estado!: InventarioDocumentoEstado;

  @ManyToOne(() => UbicacionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_origen' })
  origen!: UbicacionEntity | null;

  @ManyToOne(() => UbicacionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_destino' })
  destino!: UbicacionEntity | null;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fechaCreacion!: Date;

  @Column({ type: 'timestamptz', name: 'fecha_confirmacion', nullable: true })
  fechaConfirmacion!: Date | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => InventarioDocumentoItemEntity, (it) => it.documento, {
    cascade: true,
  })
  items!: InventarioDocumentoItemEntity[];
}

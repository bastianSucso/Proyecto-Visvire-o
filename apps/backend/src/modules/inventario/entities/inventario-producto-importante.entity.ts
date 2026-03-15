import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ProductoEntity } from '../../productos/entities/producto.entity';

@Entity('inventario_producto_importante')
@Unique('ux_inventario_producto_importante_producto', ['producto'])
@Check('chk_inventario_producto_importante_cantidad_minima_pos', '"cantidad_minima" > 0')
export class InventarioProductoImportanteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => ProductoEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'cantidad_minima' })
  cantidadMinima!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

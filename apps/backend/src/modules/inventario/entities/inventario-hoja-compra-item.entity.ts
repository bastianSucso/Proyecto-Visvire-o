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

@Entity('inventario_hoja_compra_item')
@Unique('ux_inventario_hoja_compra_item_producto', ['producto'])
@Check('chk_inventario_hoja_compra_item_cantidad_pos', '"cantidad" > 0')
export class InventarioHojaCompraItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => ProductoEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'cantidad' })
  cantidad!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

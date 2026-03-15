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

@Entity('inventario_sala_objetivo')
@Unique('ux_inventario_sala_objetivo_producto', ['producto'])
@Check('chk_inventario_sala_objetivo_stock_ideal_pos', '"stock_ideal" > 0')
export class InventarioSalaObjetivoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => ProductoEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'stock_ideal' })
  stockIdeal!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ProductoEntity } from '../../productos/entities/producto.entity';

@Entity('producto_conversion')
@Index(['productoOrigen', 'productoDestino'], { unique: true })
export class ProductoConversionEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_producto_conversion' })
  id!: number;

  @ManyToOne(() => ProductoEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_producto_origen' })
  productoOrigen!: ProductoEntity;

  @ManyToOne(() => ProductoEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_producto_destino' })
  productoDestino!: ProductoEntity;

  @Column({ type: 'numeric', precision: 14, scale: 6 })
  factor!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

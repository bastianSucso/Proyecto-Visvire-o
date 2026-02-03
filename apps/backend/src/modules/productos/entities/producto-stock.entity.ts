import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ProductoEntity } from './producto.entity';
import { UbicacionEntity } from '../../ubicaciones/entities/ubicacion.entity';

@Entity('producto_stock')
@Unique('ux_producto_ubicacion', ['producto', 'ubicacion'])
export class ProductoStockEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_producto_stock' })
  id!: number;

  @ManyToOne(() => ProductoEntity, (p) => p.stocks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @ManyToOne(() => UbicacionEntity, (u) => u.productoStocks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_ubicacion' })
  ubicacion!: UbicacionEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0 })
  cantidad!: string;
}

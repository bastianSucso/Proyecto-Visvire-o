import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VentaEntity } from './venta.entity';
import { ProductoEntity } from '../../productos/entities/producto.entity';

@Entity('venta_item')
export class VentaItemEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_item' })
  idItem!: number;

  @ManyToOne(() => VentaEntity, (v) => v.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_venta' })
  venta!: VentaEntity;

  @ManyToOne(() => ProductoEntity, { nullable: false })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'cantidad' })
  cantidad!: string;

  // Snapshot de precio al momento de agregar (en edición)
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'precio_unitario' })
  precioUnitario!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'subtotal' })
  subtotal!: string;
}

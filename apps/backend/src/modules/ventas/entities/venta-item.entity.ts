import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { VentaEntity } from './venta.entity';
import { ProductoEntity } from '../../productos/entities/producto.entity';

@Entity('venta_item')
@Unique('UQ_venta_producto', ['venta', 'producto'])
export class VentaItemEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_item' })
  idItem!: number;

  @ManyToOne(() => VentaEntity, (v) => v.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_venta' })
  venta!: VentaEntity;

  @ManyToOne(() => ProductoEntity, { nullable: false })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'int', name: 'cantidad' })
  cantidad!: number;

  // Snapshot de precio al momento de agregar (en edición)
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'precio_unitario' })
  precioUnitario!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'subtotal' })
  subtotal!: string;
}

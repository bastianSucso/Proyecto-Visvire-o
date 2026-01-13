import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { HistorialEntity } from './historial.entity';
import { ProductoEntity } from '../../productos/entities/producto.entity';

@Entity('historial_stock_venta')
@Unique('ux_historial_producto', ['historial', 'producto'])
export class HistorialStockVentaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_historial_stock_venta' })
  id!: number;

  @ManyToOne(() => HistorialEntity, (h) => h.stocksVenta, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_historial' })
  historial!: HistorialEntity;

  @ManyToOne(() => ProductoEntity, (p) => p.historialStockVenta, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'int', name: 'stock_inicial' })
  stockInicial!: number;

  @Column({ type: 'int', name: 'stock_final', nullable: true })
  stockFinal!: number | null;
}

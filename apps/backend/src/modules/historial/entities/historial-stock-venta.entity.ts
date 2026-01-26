import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { SesionCajaEntity } from './sesion-caja.entity';
import { ProductoEntity } from '../../productos/entities/producto.entity';

@Entity('historial_stock_venta')
@Unique('ux_sesion_caja_producto', ['sesionCaja', 'producto'])
export class HistorialStockVentaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_historial_stock_venta' })
  id!: number;

  @ManyToOne(() => SesionCajaEntity, (s) => s.stocksVenta, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_sesion_caja' })
  sesionCaja!: SesionCajaEntity;

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

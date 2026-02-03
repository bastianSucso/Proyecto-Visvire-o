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
import { UbicacionEntity } from '../../ubicaciones/entities/ubicacion.entity';

@Entity('stock_sesion_caja')
@Unique('ux_sesion_caja_producto_ubicacion', ['sesionCaja', 'producto', 'ubicacion'])
export class StockSesionCajaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_stock_sesion_caja' })
  id!: number;

  @ManyToOne(() => SesionCajaEntity, (s) => s.stocksVenta, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_sesion_caja' })
  sesionCaja!: SesionCajaEntity;

  @ManyToOne(() => ProductoEntity, (p) => p.stockSesionesCaja, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @ManyToOne(() => UbicacionEntity, (u) => u.stockSesionesCaja, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_ubicacion' })
  ubicacion!: UbicacionEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'stock_inicial' })
  stockInicial!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'stock_final', nullable: true })
  stockFinal!: string | null;
}

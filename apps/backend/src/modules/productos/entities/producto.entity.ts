import { HistorialStockVentaEntity } from '../../../modules/historial/entities/historial-stock-venta.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

@Entity('producto')
export class ProductoEntity {
  // id_producto
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // nombre_producto
  @Column({ type: 'varchar', length: 120 })
  name: string;

  // codigo_interno (único)
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  internalCode: string;

  // codigo_barra (opcional, único si existe)
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80, nullable: true })
  barcode: string | null;

  // unidad_base
  @Column({ type: 'varchar', length: 30, nullable: true })
  unidadBase: string | null;

  // cantidades (según MER)
  @Column({ type: 'int', default: 0 })
  stockBodega: number; // cantidad_bodega

  @Column({ type: 'int', default: 0 })
  stockSalaVenta: number; // cantidad_sala_ventas

  // precios
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  precioCosto: string; // precio_base_producto

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  precioVenta: string; // precio_venta_producto

  // activar/desactivar (si aplica)
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => HistorialStockVentaEntity, (hsv) => hsv.producto)
  historialStockVenta: HistorialStockVentaEntity[];
}

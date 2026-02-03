import { StockSesionCajaEntity } from '../../../modules/historial/entities/stock-sesion-caja.entity';
import { ProductoStockEntity } from './producto-stock.entity';
import { ProductoTipoEntity } from './producto-tipo.entity';
import { RecetaEntity } from './receta.entity';
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

  // precios
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  precioCosto: string; // precio_base_producto

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  precioVenta: string;

  // activar/desactivar (si aplica)
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  rendimiento!: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProductoStockEntity, (ps) => ps.producto)
  stocks: ProductoStockEntity[];

  @OneToMany(() => ProductoTipoEntity, (pt) => pt.producto)
  tipos: ProductoTipoEntity[];

  @OneToMany(() => RecetaEntity, (r) => r.comida)
  recetasComoComida: RecetaEntity[];

  @OneToMany(() => RecetaEntity, (r) => r.insumo)
  recetasComoInsumo: RecetaEntity[];

  @OneToMany(() => StockSesionCajaEntity, (ss) => ss.producto)
  stockSesionesCaja: StockSesionCajaEntity[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProductoStockEntity } from '../../productos/entities/producto-stock.entity';
import { StockSesionCajaEntity } from '../../historial/entities/stock-sesion-caja.entity';
import { IncidenciaStockEntity } from '../../historial/entities/incidencia-stock.entity';

export type UbicacionTipo = 'BODEGA' | 'SALA_VENTA';

@Entity('ubicacion')
export class UbicacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: UbicacionTipo;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProductoStockEntity, (ps) => ps.ubicacion)
  productoStocks: ProductoStockEntity[];


  @OneToMany(() => StockSesionCajaEntity, (ss) => ss.ubicacion)
  stockSesionesCaja: StockSesionCajaEntity[];

  @OneToMany(() => IncidenciaStockEntity, (i) => i.ubicacion)
  incidencias: IncidenciaStockEntity[];
}

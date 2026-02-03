import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProductoEntity } from './producto.entity';

export enum ProductoTipoEnum {
  REVENTA = 'REVENTA',
  INSUMO = 'INSUMO',
  COMIDA = 'COMIDA',
}

@Entity('producto_tipo')
@Unique('ux_producto_tipo', ['producto', 'tipo'])
export class ProductoTipoEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_producto_tipo' })
  id!: number;

  @ManyToOne(() => ProductoEntity, (p) => p.tipos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'enum', enum: ProductoTipoEnum })
  tipo!: ProductoTipoEnum;
}

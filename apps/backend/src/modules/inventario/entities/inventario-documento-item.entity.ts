import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { InventarioDocumentoEntity } from './inventario-documento.entity';
import { ProductoEntity } from '../../productos/entities/producto.entity';

@Entity('inventario_documento_item')
@Unique('ux_documento_producto', ['documento', 'producto'])
export class InventarioDocumentoItemEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_item' })
  id!: number;

  @ManyToOne(() => InventarioDocumentoEntity, (d) => d.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_documento' })
  documento!: InventarioDocumentoEntity;

  @ManyToOne(() => ProductoEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ type: 'varchar', length: 30, name: 'unidad_base', nullable: true })
  unidadBase!: string | null;

  @Column({ type: 'varchar', length: 80, name: 'barcode', nullable: true })
  barcode!: string | null;
}

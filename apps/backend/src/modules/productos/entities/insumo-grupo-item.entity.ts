import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InsumoGrupoEntity } from './insumo-grupo.entity';
import { ProductoEntity } from './producto.entity';

@Entity('insumo_grupo_item')
@Unique('ux_insumo_grupo_item', ['grupo', 'producto'])
export class InsumoGrupoItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InsumoGrupoEntity, (g) => g.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_insumo_grupo' })
  grupo: InsumoGrupoEntity;

  @ManyToOne(() => ProductoEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_producto' })
  producto: ProductoEntity;

  @Column({ type: 'int', nullable: true })
  priority: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

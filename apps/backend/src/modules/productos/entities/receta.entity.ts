import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProductoEntity } from './producto.entity';

@Entity('receta')
@Unique('ux_receta_comida_insumo', ['comida', 'insumo'])
export class RecetaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_receta' })
  id!: number;

  @ManyToOne(() => ProductoEntity, (p) => p.recetasComoComida, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_comida' })
  comida!: ProductoEntity;

  @ManyToOne(() => ProductoEntity, (p) => p.recetasComoInsumo, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_insumo' })
  insumo!: ProductoEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'cantidad_base' })
  cantidadBase!: string;
}

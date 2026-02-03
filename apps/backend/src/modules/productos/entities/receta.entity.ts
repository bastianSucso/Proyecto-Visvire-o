import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { InsumoGrupoEntity } from './insumo-grupo.entity';
import { ProductoEntity } from './producto.entity';

@Entity('receta')
@Unique('ux_receta_comida_grupo', ['comida', 'grupo'])
export class RecetaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_receta' })
  id!: number;

  @ManyToOne(() => ProductoEntity, (p) => p.recetasComoComida, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_comida' })
  comida!: ProductoEntity;

  @ManyToOne(() => InsumoGrupoEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_insumo_grupo' })
  grupo!: InsumoGrupoEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'cantidad_base' })
  cantidadBase!: string;
}

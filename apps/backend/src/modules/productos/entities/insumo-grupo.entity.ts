import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InsumoGrupoItemEntity } from './insumo-grupo-item.entity';

export enum InsumoGrupoStrategy {
  PRIORITY = 'PRIORITY',
  LOWEST_COST = 'LOWEST_COST',
}

@Entity('insumo_grupo')
@Unique('ux_insumo_grupo_name', ['name'])
export class InsumoGrupoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'enum', enum: InsumoGrupoStrategy })
  consumoStrategy: InsumoGrupoStrategy;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => InsumoGrupoItemEntity, (item) => item.grupo)
  items: InsumoGrupoItemEntity[];
}

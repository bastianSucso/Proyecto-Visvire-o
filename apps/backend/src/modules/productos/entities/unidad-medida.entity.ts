import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('unidad_medida')
export class UnidadMedidaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30 })
  nombre!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30, name: 'nombre_normalizado' })
  nombreNormalizado!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import { SesionCajaEntity } from '../../historial/entities/sesion-caja.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('caja')
export class CajaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_caja' })
  idCaja!: number;

  @Column({ type: 'varchar', length: 30, name: 'numero'})
  numero!: string;

  @Column({ type: 'boolean', default: true, name: 'activa' })
  activa!: boolean;

  @OneToMany(() => SesionCajaEntity, (s) => s.caja)
  sesiones!: SesionCajaEntity[];
}

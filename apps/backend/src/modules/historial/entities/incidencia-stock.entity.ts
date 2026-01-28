import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { SesionCajaEntity } from './sesion-caja.entity';
import { ProductoEntity } from '../../productos/entities/producto.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { UbicacionEntity } from '../../ubicaciones/entities/ubicacion.entity';

export type IncidenciaTipo = 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';

@Entity('incidencia_stock')
export class IncidenciaStockEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_incidencia_stock' })
  id!: number;

  @ManyToOne(() => SesionCajaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sesion_caja' }) 
  sesionCaja!: SesionCajaEntity;

  @ManyToOne(() => ProductoEntity, { nullable: false })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @ManyToOne(() => UbicacionEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_ubicacion' })
  ubicacion!: UbicacionEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @Column({ type: 'varchar', length: 20 })
  tipo!: IncidenciaTipo;

  @Column({ type: 'int' })
  cantidad!: number; // positiva. La interpretación depende de tipo.

  @Column({ type: 'varchar', length: 300, nullable: true })
  observacion!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha' })
  fecha!: Date;
}

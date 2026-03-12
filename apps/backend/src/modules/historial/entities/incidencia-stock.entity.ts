import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SesionCajaEntity } from './sesion-caja.entity';
import { ProductoEntity } from '../../productos/entities/producto.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { UbicacionEntity } from '../../ubicaciones/entities/ubicacion.entity';
import { IncidenciaResolucionAdminEntity } from './incidencia-resolucion-admin.entity';
import { InconsistenciaCategoriaEntity } from './inconsistencia-categoria.entity';

export type IncidenciaOrigen = 'VENDEDOR' | 'ADMIN';
export type IncidenciaContexto = 'DURANTE_JORNADA' | 'FUERA_JORNADA';

@Entity('incidencia_stock')
export class IncidenciaStockEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_incidencia_stock' })
  id!: number;

  @ManyToOne(() => SesionCajaEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sesion_caja' }) 
  sesionCaja!: SesionCajaEntity | null;

  @ManyToOne(() => ProductoEntity, { nullable: false })
  @JoinColumn({ name: 'id_producto' })
  producto!: ProductoEntity;

  @ManyToOne(() => UbicacionEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_ubicacion' })
  ubicacion!: UbicacionEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @Column({ type: 'varchar', length: 20, default: 'VENDEDOR' })
  origen!: IncidenciaOrigen;

  @Column({ type: 'varchar', length: 30, default: 'DURANTE_JORNADA' })
  contexto!: IncidenciaContexto;

  @Column({ type: 'timestamptz', name: 'fecha_hora_deteccion' })
  fechaHoraDeteccion!: Date;

  @ManyToOne(() => InconsistenciaCategoriaEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_inconsistencia_categoria' })
  categoria!: InconsistenciaCategoriaEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  cantidad!: string; // positiva. La interpretación depende de tipo.

  @Column({ type: 'varchar', length: 300, nullable: true })
  observacion!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha' })
  fecha!: Date;

  @OneToOne(() => IncidenciaResolucionAdminEntity, (resolucion) => resolucion.incidencia)
  resolucionAdmin!: IncidenciaResolucionAdminEntity | null;
}

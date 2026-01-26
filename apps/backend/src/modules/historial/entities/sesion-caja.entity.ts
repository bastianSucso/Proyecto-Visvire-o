import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CajaEntity } from '../../caja/entities/caja.entity';
import { HistorialStockVentaEntity } from './historial-stock-venta.entity';

export enum SesionCajaEstado {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

@Index('ux_sesion_abierta_por_caja', ['caja'], {
  unique: true,
  where: `"fecha_cierre" IS NULL`,
})
@Index('ux_sesion_abierta_por_usuario', ['usuario'], {
  unique: true,
  where: `"fecha_cierre" IS NULL`,
})
@Entity('sesion_caja')
export class SesionCajaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_sesion_caja' })
  id!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_apertura' })
  fechaApertura!: Date;

  @Column({ type: 'timestamptz', name: 'fecha_cierre', nullable: true })
  fechaCierre!: Date | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'monto_inicial' })
  montoInicial!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'monto_final', nullable: true })
  montoFinal!: string | null;

  @Column({
    type: 'enum',
    enum: SesionCajaEstado,
    default: SesionCajaEstado.ABIERTA,
    name: 'estado',
  })
  estado!: SesionCajaEstado;

  @ManyToOne(() => CajaEntity, (c) => c.sesiones, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_caja' })
  caja!: CajaEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'id_usuario_abre' })
  usuario!: UserEntity;

  @OneToMany(() => HistorialStockVentaEntity, (hsv) => hsv.sesionCaja)
  stocksVenta!: HistorialStockVentaEntity[];
}

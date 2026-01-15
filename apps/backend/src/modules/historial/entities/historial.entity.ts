import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CajaEntity } from '../../caja/entities/caja.entity';
import { HistorialStockVentaEntity } from './historial-stock-venta.entity';

@Entity('historial')
export class HistorialEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_historial' })
  idHistorial!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_apertura' })
  fechaApertura!: Date;

  @Column({ type: 'timestamptz', name: 'fecha_cierre', nullable: true })
  fechaCierre!: Date | null;

  @ManyToOne(() => UserEntity, (u) => u.historiales, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @OneToOne(() => CajaEntity, (c) => c.historial, { cascade: true })
  caja!: CajaEntity;

  @OneToMany(() => HistorialStockVentaEntity, (hsv) => hsv.historial)
  stocksVenta!: HistorialStockVentaEntity[];
}

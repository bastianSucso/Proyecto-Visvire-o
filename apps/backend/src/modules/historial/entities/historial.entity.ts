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

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_apertura' })
  fechaApertura!: Date;

  @Column({ type: 'timestamp', name: 'fecha_cierre', nullable: true })
  fechaCierre!: Date | null;

  // Los dejamos nullable (tu intención real "por producto" va en HistorialStockVenta)
  @Column({ type: 'int', name: 'cantidad_inicial_producto', nullable: true })
  cantidadInicialProducto!: number | null;

  @Column({ type: 'int', name: 'cantidad_final_producto', nullable: true })
  cantidadFinalProducto!: number | null;

  
  @ManyToOne(() => UserEntity, (u) => u.historiales, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: UserEntity;

  @OneToOne(() => CajaEntity, (c) => c.historial, { cascade: true })
  caja!: CajaEntity;

  @OneToMany(() => HistorialStockVentaEntity, (hsv) => hsv.historial)
  stocksVenta!: HistorialStockVentaEntity[];
}

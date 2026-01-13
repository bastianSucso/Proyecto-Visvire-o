import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { HistorialEntity } from '../../historial/entities/historial.entity';

export enum CajaEstado {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

@Entity('caja')
export class CajaEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_caja' })
  idCaja!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'monto_inicial' })
  montoInicial!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'monto_final', nullable: true })
  montoFinal!: string | null;

  @Column({ type: 'enum', enum: CajaEstado, default: CajaEstado.ABIERTA, name: 'estado' })
  estado!: CajaEstado;

  @OneToOne(() => HistorialEntity, (h) => h.caja, { nullable: false })
  @JoinColumn({ name: 'id_historial' })
  historial!: HistorialEntity;
}

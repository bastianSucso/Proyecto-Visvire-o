import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PagoPersonalEntity } from './pago-personal.entity';

@Entity('rrhh_pago_personal_cambio')
export class PagoPersonalCambioEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PagoPersonalEntity, (pago) => pago.cambios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pago_id' })
  pago!: PagoPersonalEntity;

  @Column({ type: 'varchar', length: 300 })
  motivo!: string;

  @Column({ type: 'jsonb' })
  antes!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  despues!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64, name: 'changed_by_user_id' })
  changedByUserId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'changed_at' })
  changedAt!: Date;
}

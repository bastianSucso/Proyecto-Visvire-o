import { SesionCajaEntity } from '../../historial/entities/sesion-caja.entity';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type UserRole = 'ADMIN' | 'VENDEDOR';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_usuario' })
  idUsuario: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true,})
  nombre?: string;

  @Column({ nullable: true,})
  apellido?: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: ['ADMIN', 'VENDEDOR'], default: 'VENDEDOR' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SesionCajaEntity, sc => sc.usuario)
  historiales: SesionCajaEntity[];

}

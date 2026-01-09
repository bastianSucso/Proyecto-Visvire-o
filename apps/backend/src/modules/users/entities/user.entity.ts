import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type UserRole = 'ADMIN' | 'VENDEDOR';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true,})
  nombre?: string;

  @Column({ nullable: true,})
  apellido?: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: ['ADMIN', 'VENDEDOR'], default: 'VENDEDOR' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'varchar'})
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;
}

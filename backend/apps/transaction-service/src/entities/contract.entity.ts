import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

export enum ContractType {
  PROJECT = 'project',
  SERVICE = 'service',
  TEAM = 'team',
  INDIVIDUAL = 'individual',
}

@Entity({ schema: 'transaction_service', name: 'contracts' })
@Index(['clientUsername'], { unique: true })
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: ContractType })
  type: ContractType

  @Column({ name: 'client_name', type: 'varchar', length: 100 })
  clientName: string

  @Column({ name: 'client_username', type: 'varchar', length: 100, unique: true })
  clientUsername: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

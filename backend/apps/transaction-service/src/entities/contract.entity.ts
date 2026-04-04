import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, Index,
  } from 'typeorm';
  import { ContractType } from './enums';
   
  @Entity({ schema: 'transaction_service', name: 'contracts' })
  export class Contract {
   
    @PrimaryGeneratedColumn('uuid')
    id!: string;
   
    @Column({ type: 'enum', enum: ContractType })
    @Index()
    type!: ContractType;
   
    @Column({ name: 'client_name', type: 'varchar', length: 100 })
    clientName!: string;
   
    @Column({ name: 'client_username', type: 'varchar', length: 100, unique: true })
    @Index()
    clientUsername!: string;
   
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
  }
  
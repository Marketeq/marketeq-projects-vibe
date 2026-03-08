import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Contract } from './entities/contract.entity';
import { ContractGroup } from './entities/contract-group.entity';
import { ContractsService } from './services/contracts.service';
import { ContractsController } from './controllers/contracts.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'contracts',
      entities: [Contract, ContractGroup],
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([Contract, ContractGroup]),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsServiceModule {}

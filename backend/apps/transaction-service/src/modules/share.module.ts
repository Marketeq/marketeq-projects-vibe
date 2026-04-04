import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Transaction } from '../entities/transaction.entity';
import { Invoice }     from '../entities/invoice.entity';

import { ShareService }    from '../services/share.service';
import { ShareController } from '../controllers/share.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Invoice]),
  ],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
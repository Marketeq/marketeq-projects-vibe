import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPublicKey } from './entities/user-public-key.entity';
import { ConversationKey } from './entities/conversation-key.entity';
import { ConversationRawKey } from './entities/conversation-raw-key.entity';
import { Thread } from '../threads/entities/thread.entity';
import { Message } from '../messages/entities/message.entity';
import { EncryptionService } from './encryption.service';
import { EncryptionController } from './encryption.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserPublicKey, ConversationKey, ConversationRawKey, Thread, Message])],
  controllers: [EncryptionController],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}

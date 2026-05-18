import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Thread } from './threads/entities/thread.entity';
import { ThreadUserState } from './threads/entities/thread-user-state.entity';
import { ThreadList } from './threads/entities/thread-list.entity';
import { ThreadListAssignment } from './threads/entities/thread-list-assignment.entity';
import { Message } from './messages/entities/message.entity';
import { Attachment } from './messages/entities/attachment.entity';
import { UserPublicKey } from './encryption/entities/user-public-key.entity';
import { ConversationKey } from './encryption/entities/conversation-key.entity';
import { ConversationRawKey } from './encryption/entities/conversation-raw-key.entity';
import { AblyService } from './ably/ably.service';
import { MessagesService } from './messages/messages.service';
import { MessagesController } from './messages/messages.controller';
import { AttachmentsController } from './messages/attachments.controller';
import { ThreadsService } from './threads/threads.service';
import { ThreadsController } from './threads/threads.controller';
import { EncryptionModule } from './encryption/encryption.module';
import { TrashCleanupService } from './threads/trash-cleanup.service';
import { StorageModule } from './storage/storage.module';
import { BlocksModule } from './blocks/blocks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'messaging',
      entities: [Thread, ThreadUserState, ThreadList, ThreadListAssignment, Message, Attachment, UserPublicKey, ConversationKey, ConversationRawKey],
      synchronize: process.env.NODE_ENV !== 'production',
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
      extra: { options: '-c timezone=UTC' },
    }),
    TypeOrmModule.forFeature([Thread, ThreadUserState, ThreadList, ThreadListAssignment, Message, Attachment, ConversationKey]),
    EncryptionModule,
    StorageModule,
    BlocksModule,
  ],
  controllers: [MessagesController, AttachmentsController, ThreadsController],
  providers: [AblyService, MessagesService, ThreadsService, TrashCleanupService],
})
export class MessagingServiceModule {}

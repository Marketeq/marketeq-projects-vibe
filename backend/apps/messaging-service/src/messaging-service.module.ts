import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Thread } from './threads/entities/thread.entity';
import { Message } from './messages/entities/message.entity';
import { Attachment } from './messages/entities/attachment.entity';
import { AblyService } from './ably/ably.service';
import { MessagesService } from './messages/messages.service';
import { MessagesController } from './messages/messages.controller';
import { ThreadsService } from './threads/threads.service';
import { ThreadsController } from './threads/threads.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'messaging',
      entities: [Thread, Message, Attachment],
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([Thread, Message, Attachment]),
  ],
  controllers: [MessagesController, ThreadsController],
  providers: [AblyService, MessagesService, ThreadsService],
})
export class MessagingServiceModule {}

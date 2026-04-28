import { InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { MessagesService } from '../src/messages/messages.service';
import { ThreadsService } from '../src/threads/threads.service';
import { Message } from '../src/messages/entities/message.entity';
import { Attachment } from '../src/messages/entities/attachment.entity';
import { Thread } from '../src/threads/entities/thread.entity';
import { ThreadUserState } from '../src/threads/entities/thread-user-state.entity';
import { ThreadList } from '../src/threads/entities/thread-list.entity';
import { ThreadListAssignment } from '../src/threads/entities/thread-list-assignment.entity';
import { ConversationKey } from '../src/encryption/entities/conversation-key.entity';
import { AblyService } from '../src/ably/ably.service';
import { R2Service } from '../src/storage/r2.service';

const USER_A = 'user-a';
const USER_B = 'user-b';
const THREAD_ID = 'thread-1';

function makeThread(participants: string[]): Thread {
  return {
    id: THREAD_ID,
    participantIds: participants,
    isGroup: false,
    groupName: null,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Thread;
}

describe('Messaging regressions (PR #123)', () => {
  describe('R2Service uploadMessageAttachment', () => {
    it('fails before uploading when the public URL is not configured', async () => {
      const configService = {
        get: jest.fn((name: string) => {
          if (name === 'CLOUDFLARE_R2_BUCKET') return 'attachments';
          return undefined;
        }),
      };
      const service = new R2Service(configService as unknown as ConfigService);
      const getClient = jest.fn();
      (service as any).getClient = getClient;

      await expect(
        service.uploadMessageAttachment(THREAD_ID, {
          originalname: 'spec.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('hello'),
        } as Express.Multer.File),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(getClient).not.toHaveBeenCalled();
    });
  });

  describe('MessagesService.uploadAttachment', () => {
    it('cleans up the uploaded object when the DB transaction fails', async () => {
      const threadRepo = { findOne: jest.fn().mockResolvedValue(makeThread([USER_A, USER_B])) };
      const attachmentRepo = { create: jest.fn(), save: jest.fn() };
      const r2Service = {
        uploadMessageAttachment: jest
          .fn()
          .mockResolvedValue({ key: 'messages/thread/file.pdf', url: 'https://cdn.example/messages/thread/file.pdf' }),
        deleteObject: jest.fn().mockResolvedValue(undefined),
      };
      const dataSource = {
        transaction: jest.fn().mockRejectedValue(new Error('db write failed')),
      };

      const mod = await Test.createTestingModule({
        providers: [
          MessagesService,
          {
            provide: getRepositoryToken(Message),
            useValue: {
              find: jest.fn(),
              findOne: jest.fn(),
              update: jest.fn(),
              createQueryBuilder: jest.fn(),
            },
          },
          { provide: getRepositoryToken(Attachment), useValue: attachmentRepo },
          { provide: getRepositoryToken(Thread), useValue: threadRepo },
          {
            provide: AblyService,
            useValue: {
              publishMessageNew: jest.fn(),
              publishMessageEdit: jest.fn(),
              publishMessageDelete: jest.fn(),
              publishMessageRestore: jest.fn(),
              publishMessageRead: jest.fn(),
            },
          },
          { provide: R2Service, useValue: r2Service },
          { provide: DataSource, useValue: dataSource },
        ],
      }).compile();

      const service = mod.get(MessagesService);

      await expect(
        service.uploadAttachment({
          threadId: THREAD_ID,
          senderId: USER_A,
          file: {
            originalname: 'spec.pdf',
            mimetype: 'application/pdf',
            size: 12,
            buffer: Buffer.from('hello'),
          } as Express.Multer.File,
        }),
      ).rejects.toThrow('db write failed');

      expect(r2Service.deleteObject).toHaveBeenCalledWith(
        'messages/thread/file.pdf',
      );
    });
  });

  describe('ThreadsService.create', () => {
    it('reuses the earliest existing one-to-one thread instead of creating a new one', async () => {
      const existing = makeThread([USER_A, USER_B]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
      };
      const threadRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn().mockImplementation((obj: any) => obj),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };

      const mod = await Test.createTestingModule({
        providers: [
          ThreadsService,
          { provide: getRepositoryToken(Thread), useValue: threadRepo },
          { provide: getRepositoryToken(ConversationKey), useValue: {} },
          { provide: getRepositoryToken(ThreadUserState), useValue: {} },
          { provide: getRepositoryToken(ThreadList), useValue: {} },
          { provide: getRepositoryToken(ThreadListAssignment), useValue: {} },
          { provide: AblyService, useValue: {} },
        ],
      }).compile();

      const service = mod.get(ThreadsService);
      const result = await service.create([USER_A, USER_B], false, undefined, USER_A);

      expect(result).toBe(existing);
      expect(threadRepo.save).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('t.createdAt', 'ASC');
      expect(qb.limit).toHaveBeenCalledWith(1);
    });

    it('re-queries and returns the winning thread after a duplicate-key race', async () => {
      const existing = makeThread([USER_A, USER_B]);
      const firstQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null),
      };
      const secondQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
      };
      const threadRepo = {
        findOne: jest.fn(),
        save: jest.fn().mockRejectedValue({ code: '23505' }),
        create: jest
          .fn()
          .mockImplementation((obj: Record<string, unknown>) => obj),
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(firstQb)
          .mockReturnValueOnce(secondQb),
      };

      const mod = await Test.createTestingModule({
        providers: [
          ThreadsService,
          { provide: getRepositoryToken(Thread), useValue: threadRepo },
          { provide: getRepositoryToken(ConversationKey), useValue: {} },
          { provide: getRepositoryToken(ThreadUserState), useValue: {} },
          { provide: getRepositoryToken(ThreadList), useValue: {} },
          { provide: getRepositoryToken(ThreadListAssignment), useValue: {} },
          { provide: AblyService, useValue: {} },
        ],
      }).compile();

      const service = mod.get(ThreadsService);
      const result = await service.create([USER_A, USER_B], false, undefined, USER_A);

      expect(result).toBe(existing);
      expect(threadRepo.save).toHaveBeenCalledTimes(1);
      expect(threadRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(secondQb.orderBy).toHaveBeenCalledWith('t.createdAt', 'ASC');
      expect(secondQb.limit).toHaveBeenCalledWith(1);
    });
  });
});

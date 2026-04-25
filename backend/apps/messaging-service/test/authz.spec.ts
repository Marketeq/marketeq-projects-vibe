import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MessagesService } from '../src/messages/messages.service';
import { ThreadsService } from '../src/threads/threads.service';
import { DataSource } from 'typeorm';
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
const USER_OUTSIDER = 'user-outsider';
const THREAD_ID = 'thread-1';
const MESSAGE_ID = 'message-1';

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

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: MESSAGE_ID,
    threadId: THREAD_ID,
    senderId: USER_A,
    content: 'hello',
    ciphertext: null,
    deleted: false,
    edited: false,
    pinned: false,
    starred: false,
    status: 'sent',
    createdAt: new Date(),
    ...overrides,
  } as unknown as Message;
}

describe('MessagesService authz (PR-B1)', () => {
  let service: MessagesService;
  let messageRepo: { find: jest.Mock; findOne: jest.Mock; update: jest.Mock; createQueryBuilder: jest.Mock };
  let threadRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    messageRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    threadRepo = { findOne: jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: messageRepo },
        { provide: getRepositoryToken(Attachment), useValue: { create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(Thread), useValue: threadRepo },
        { provide: AblyService, useValue: { publishMessageNew: jest.fn(), publishMessageEdit: jest.fn(), publishMessageDelete: jest.fn(), publishMessageRestore: jest.fn(), publishMessageRead: jest.fn() } },
        { provide: R2Service, useValue: { uploadMessageAttachment: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    service = mod.get(MessagesService);
  });

  describe('getThreadMessages', () => {
    it('rejects non-participants with 403', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      await expect(service.getThreadMessages(THREAD_ID, USER_OUTSIDER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects missing userId with 403', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      await expect(service.getThreadMessages(THREAD_ID, '')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws 404 when thread does not exist', async () => {
      threadRepo.findOne.mockResolvedValue(null);
      await expect(service.getThreadMessages(THREAD_ID, USER_A)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns messages for a participant', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      messageRepo.find.mockResolvedValue([makeMessage()]);
      const result = await service.getThreadMessages(THREAD_ID, USER_A);
      expect(result).toHaveLength(1);
    });
  });

  describe('forward', () => {
    it('rejects a sender who is not a participant of the source thread with 403', async () => {
      messageRepo.findOne.mockResolvedValue(makeMessage({ senderId: USER_A }));
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      await expect(service.forward(MESSAGE_ID, [USER_B], USER_OUTSIDER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when source message not found', async () => {
      messageRepo.findOne.mockResolvedValue(null);
      await expect(service.forward(MESSAGE_ID, [USER_B], USER_A)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('caps recipient list at 5', async () => {
      const many = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
      await expect(service.forward(MESSAGE_ID, many, USER_A)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('pin / unpin / star', () => {
    it.each([
      ['pin', (s: MessagesService) => s.pin(MESSAGE_ID, USER_OUTSIDER)],
      ['unpin', (s: MessagesService) => s.unpin(MESSAGE_ID, USER_OUTSIDER)],
      ['star', (s: MessagesService) => s.star(MESSAGE_ID, USER_OUTSIDER)],
    ])('%s rejects non-participants with 403', async (_name, act) => {
      messageRepo.findOne.mockResolvedValue(makeMessage());
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      await expect(act(service)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('pin throws 404 when message not found', async () => {
      messageRepo.findOne.mockResolvedValue(null);
      await expect(service.pin(MESSAGE_ID, USER_A)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('search', () => {
    it('rejects missing userId with 403', async () => {
      await expect(service.search('anything', '')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns [] for empty query without hitting the DB', async () => {
      const result = await service.search('', USER_A);
      expect(result).toEqual([]);
      expect(messageRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('truncates query to 128 chars and scopes to user via EXISTS', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      const longQuery = 'x'.repeat(500);
      await service.search(longQuery, USER_A);

      // First andWhere = deleted false; second andWhere = EXISTS scoping clause.
      const existsCall = qb.andWhere.mock.calls.find((args: any[]) =>
        typeof args[0] === 'string' && args[0].includes('EXISTS')
      );
      expect(existsCall).toBeTruthy();
      expect(existsCall[1]).toEqual({ userId: USER_A });

      // Content ILIKE parameter must be capped to 128 chars inside the '%...%' wrapper.
      const ilikeCall = qb.where.mock.calls.find((args: any[]) =>
        typeof args[0] === 'string' && args[0].includes('ILIKE')
      );
      expect(ilikeCall[1].q.length).toBe(128 + 2); // '%' + q + '%'
    });
  });
});

describe('ThreadsService authz (PR-B1)', () => {
  let service: ThreadsService;
  let threadRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    threadRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((obj: any) => obj),
      createQueryBuilder: jest.fn(),
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

    service = mod.get(ThreadsService);
  });

  describe('findOne', () => {
    it('rejects non-participants with 403', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      await expect(service.findOne(THREAD_ID, USER_OUTSIDER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws 404 when thread not found', async () => {
      threadRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(THREAD_ID, USER_A)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns thread for a participant', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      const t = await service.findOne(THREAD_ID, USER_A);
      expect(t.id).toBe(THREAD_ID);
    });

    it('does not eager-load messages relation', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread([USER_A, USER_B]));
      await service.findOne(THREAD_ID, USER_A);
      const call = threadRepo.findOne.mock.calls[0][0];
      expect(call.relations).toBeUndefined();
    });
  });

  describe('create', () => {
    it('rejects a requester who is not in participantIds with 403', async () => {
      await expect(
        service.create([USER_A, USER_B], false, undefined, USER_OUTSIDER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects threads with fewer than 2 participants with 400', async () => {
      await expect(service.create([USER_A], false, undefined, USER_A)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows create when requester is a participant', async () => {
      threadRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      threadRepo.save.mockResolvedValue({ id: 'new-thread', participantIds: [USER_A, USER_B] });
      const t = await service.create([USER_A, USER_B], false, undefined, USER_A);
      expect(t).toBeDefined();
    });
  });
});

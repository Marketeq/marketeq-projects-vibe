import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Thread } from "./entities/thread.entity";
import { ThreadUserState } from "./entities/thread-user-state.entity";
import { ThreadList } from "./entities/thread-list.entity";
import { ThreadListAssignment } from "./entities/thread-list-assignment.entity";
import { ConversationKey } from "../encryption/entities/conversation-key.entity";
import { Message } from "../messages/entities/message.entity";
import { Attachment } from "../messages/entities/attachment.entity";
import { AblyService } from "../ably/ably.service";
import { BlockEnforcementService } from "../blocks/block-enforcement.service";
import { BulkAction } from "./dtos/thread-list.dto";

type StateFlag =
  | "isPinned"
  | "isStarred"
  | "isArchived"
  | "isSpam"
  | "isMuted"
  | "isTrashed"
  | "markedUnread";

@Injectable()
export class ThreadsService {
  constructor(
    @InjectRepository(Thread) private readonly repo: Repository<Thread>,
    @InjectRepository(ConversationKey)
    private readonly convKeyRepo: Repository<ConversationKey>,
    @InjectRepository(ThreadUserState)
    private readonly stateRepo: Repository<ThreadUserState>,
    @InjectRepository(ThreadList)
    private readonly listRepo: Repository<ThreadList>,
    @InjectRepository(ThreadListAssignment)
    private readonly assignRepo: Repository<ThreadListAssignment>,
    private readonly ably: AblyService,
    private readonly blockEnforcement: BlockEnforcementService,
  ) {}

  async getUserThreads(userId: string) {
    const allThreads = await this.repo
      .createQueryBuilder("t")
      .where(":userId = ANY(t.participantIds)", { userId })
      .orderBy("t.updatedAt", "DESC")
      .getMany();

    const threads = await this.blockEnforcement.filterThreadsForBlocks(userId, allThreads);
    const threadIds = threads.map((t) => t.id);
    const states = threadIds.length
      ? await this.stateRepo.find({
          where: { userId, threadId: In(threadIds) },
        })
      : [];
    const stateByThread = new Map(states.map((s) => [s.threadId, s]));

    const enriched = await Promise.all(
      threads.map(async (t) => {
        const lastMessage = await this.repo.manager
          .createQueryBuilder(Message, "m")
          .where('m."threadId" = :tid', { tid: t.id })
          .andWhere("m.deleted = false")
          .orderBy('m."createdAt"', "DESC")
          .limit(1)
          .getRawOne();
        // If the last message is a file/image, attach its first attachment
        // so the conversation list preview can show "📎 filename.pdf" or an
        // image thumbnail without a follow-up fetch per row.
        let lastAttachment: any = null;
        if (lastMessage?.m_id && lastMessage.m_messageType === 'file') {
          lastAttachment = await this.repo.manager
            .createQueryBuilder(Attachment, 'a')
            .where('a."messageId" = :mid', { mid: lastMessage.m_id })
            .limit(1)
            .getRawOne();
        }
        const s = stateByThread.get(t.id);

        const unreadQb = this.repo.manager
          .createQueryBuilder('messaging.messages', 'm')
          .where('m."threadId" = :tid', { tid: t.id })
          .andWhere('m.deleted = false')
          .andWhere('m."senderId" != :userId', { userId });
        if (s?.lastReadAt) {
          unreadQb.andWhere(
            `(m."createdAt" AT TIME ZONE 'UTC') > :lastReadAt`,
            { lastReadAt: s.lastReadAt },
          );
        }
        const unreadCount = await unreadQb.getCount();

        return {
          ...t,
          lastMessage: lastMessage
            ? { ...lastMessage, attachment: lastAttachment || null }
            : null,
          isPinned: s?.isPinned ?? false,
          isStarred: s?.isStarred ?? false,
          isArchived: s?.isArchived ?? false,
          isSpam: s?.isSpam ?? false,
          isMuted: s?.isMuted ?? false,
          isTrashed: s?.isTrashed ?? false,
          markedUnread: s?.markedUnread ?? false,
          lastReadAt: s?.lastReadAt ?? null,
          unreadCount,
        };
      }),
    );

    // Pinned-first per Doc 03 AC §1.1; keep updatedAt DESC within each group.
    enriched.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return enriched;
  }

  async findOne(id: string, userId: string) {
    const thread = await this.repo.findOne({ where: { id } });
    if (!thread) throw new NotFoundException("Thread not found");
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException("Not a participant of this thread");
    }
    return thread;
  }

  async assertUserIsParticipant(threadId: string, userId: string) {
    const thread = await this.repo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException("Thread not found");
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException("Not a participant of this thread");
    }
    return thread;
  }

  async create(
    participantIds: string[],
    isGroup = false,
    groupName?: string,
    requesterId?: string,
  ) {
    if (!participantIds || participantIds.length < 2) {
      throw new BadRequestException(
        "A thread must have at least 2 participants",
      );
    }
    if (requesterId && !participantIds.includes(requesterId)) {
      throw new ForbiddenException(
        "Cannot create a thread you are not a participant of",
      );
    }

    // For 1:1 threads, find existing thread between the same participants
    if (!isGroup && participantIds.length === 2) {
      const existing = await this.findOneToOneThread(
        participantIds[0],
        participantIds[1],
      );
      if (existing) return existing;
      await this.blockEnforcement.assertCanCreate(participantIds);
    }

    const thread = this.repo.create({ participantIds, isGroup, groupName });
    try {
      return await this.repo.save(thread);
    } catch (err: any) {
      // Postgres unique_violation from the partial index on (LEAST, GREATEST)
      // of participant pairs — a concurrent request won the race. Re-query
      // and return the winning row so the client still gets a valid thread.
      if (err?.code === '23505' && !isGroup && participantIds.length === 2) {
        const existing = await this.findOneToOneThread(participantIds[0], participantIds[1]);
        if (existing) return existing;
      }
      throw err;
    }
  }

  private async findOneToOneThread(userA: string, userB: string) {
    return this.repo
      .createQueryBuilder('t')
      .where('t.isGroup = false')
      .andWhere(':a = ANY(t.participantIds)', { a: userA })
      .andWhere(':b = ANY(t.participantIds)', { b: userB })
      .orderBy('t.createdAt', 'ASC')
      .limit(1)
      .getOne();
  }

  async addParticipant(
    threadId: string,
    requesterId: string,
    newUserId: string,
    encryptedGroupKey: string,
  ) {
    const thread = await this.repo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException("Thread not found");
    if (!thread.isGroup)
      throw new BadRequestException(
        "Cannot add participants to a non-group thread",
      );
    if (!thread.participantIds.includes(requesterId)) {
      throw new ForbiddenException("Not a participant of this thread");
    }
    if (thread.participantIds.includes(newUserId)) {
      throw new BadRequestException("User is already a participant");
    }

    // Add user to thread participants
    thread.participantIds = [...thread.participantIds, newUserId];
    await this.repo.save(thread);

    // Store the pre-wrapped conversation key for the new participant
    await this.convKeyRepo.save(
      this.convKeyRepo.create({
        threadId,
        userId: newUserId,
        encryptedKey: encryptedGroupKey,
      }),
    );

    return thread;
  }

  async getAblyToken(userId: string, ablyService: any) {
    return ablyService.createTokenRequest(userId);
  }

  private async assertParticipant(
    threadId: string,
    userId: string,
  ): Promise<Thread> {
    const thread = await this.repo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException("Thread not found");
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException("Not a participant of this thread");
    }
    return thread;
  }

  private async upsertState(
    threadId: string,
    userId: string,
    patch: Partial<ThreadUserState>,
  ): Promise<ThreadUserState> {
    await this.assertParticipant(threadId, userId);
    let state = await this.stateRepo.findOne({ where: { threadId, userId } });
    if (!state) {
      state = this.stateRepo.create({ threadId, userId, ...patch });
      const saved = await this.stateRepo.save(state);
      this.ably
        .publishThreadStateChanged(userId, threadId, patch)
        .catch(() => undefined);
      return saved;
    }
    // Partial UPDATE only — avoids race where concurrent save() overwrites
    // fields it didn't intend to change (e.g. markRead resetting isTrashed).
    await this.stateRepo.update({ id: state.id }, patch);
    const updated = await this.stateRepo.findOne({ where: { id: state.id } });
    this.ably
      .publishThreadStateChanged(userId, threadId, patch)
      .catch(() => undefined);
    return updated!;
  }

  async setFlag(
    threadId: string,
    userId: string,
    flag: StateFlag,
    value: boolean,
  ) {
    return this.upsertState(threadId, userId, {
      [flag]: value,
    } as Partial<ThreadUserState>);
  }

  async markRead(threadId: string, userId: string) {
    return this.upsertState(threadId, userId, {
      markedUnread: false,
      lastReadAt: new Date(),
    });
  }

  async markUnread(threadId: string, userId: string) {
    return this.upsertState(threadId, userId, { markedUnread: true });
  }

  async removeParticipant(
    threadId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const thread = await this.assertParticipant(threadId, requesterId);
    if (!thread.isGroup) {
      throw new BadRequestException(
        "Cannot remove participants from a non-group thread",
      );
    }
    if (!thread.participantIds.includes(targetUserId)) {
      throw new NotFoundException("User is not a participant");
    }
    if (targetUserId !== requesterId) {
      // For now allow any participant to remove self; group admin rules are a later concern.
      throw new ForbiddenException("Only self-removal is supported");
    }
    thread.participantIds = thread.participantIds.filter(
      (id) => id !== targetUserId,
    );
    await this.repo.save(thread);
    await this.convKeyRepo.delete({ threadId, userId: targetUserId });
    this.ably
      .publishThreadStateChanged(targetUserId, threadId, { removed: true })
      .catch(() => undefined);
    return { ok: true };
  }

  // --- Custom lists ---

  async createList(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException("Name required");
    const existing = await this.listRepo.findOne({
      where: { userId, name: trimmed },
    });
    if (existing) throw new ConflictException("List name already exists");
    const saved = await this.listRepo.save(
      this.listRepo.create({ userId, name: trimmed }),
    );
    this.ably.publishThreadListsChanged(userId).catch(() => undefined);
    return saved;
  }

  async getLists(userId: string) {
    return this.listRepo.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });
  }

  async renameList(userId: string, listId: string, name: string) {
    const list = await this.listRepo.findOne({ where: { id: listId, userId } });
    if (!list) throw new NotFoundException("List not found");
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException("Name required");
    const clash = await this.listRepo.findOne({
      where: { userId, name: trimmed },
    });
    if (clash && clash.id !== listId)
      throw new ConflictException("List name already exists");
    list.name = trimmed;
    const saved = await this.listRepo.save(list);
    this.ably.publishThreadListsChanged(userId).catch(() => undefined);
    return saved;
  }

  async deleteList(userId: string, listId: string) {
    const list = await this.listRepo.findOne({ where: { id: listId, userId } });
    if (!list) throw new NotFoundException("List not found");
    await this.assignRepo.delete({ listId, userId });
    await this.listRepo.delete({ id: listId });
    this.ably.publishThreadListsChanged(userId).catch(() => undefined);
    return { ok: true };
  }

  async assignThreadToLists(
    threadId: string,
    userId: string,
    listIds: string[],
  ) {
    await this.assertParticipant(threadId, userId);
    const owned = await this.listRepo.find({
      where: {
        userId,
        id: In(
          listIds.length ? listIds : ["00000000-0000-0000-0000-000000000000"],
        ),
      },
    });
    if (owned.length !== listIds.length) {
      throw new BadRequestException("One or more lists do not belong to user");
    }
    await this.assignRepo.delete({ threadId, userId });
    if (listIds.length) {
      await this.assignRepo.save(
        listIds.map((listId) =>
          this.assignRepo.create({ threadId, userId, listId }),
        ),
      );
    }
    const assignments = await this.assignRepo.find({
      where: { threadId, userId },
    });
    this.ably
      .publishThreadListAssignments(userId, threadId, listIds)
      .catch(() => undefined);
    return assignments;
  }

  // --- Bulk ---

  async bulkAction(userId: string, ids: string[], action: BulkAction) {
    if (!ids.length) return { updated: 0 };
    // Verify all threads belong to user
    const threads = await this.repo.find({ where: { id: In(ids) } });
    for (const t of threads) {
      if (!t.participantIds.includes(userId)) {
        throw new ForbiddenException(`Not a participant of thread ${t.id}`);
      }
    }
    if (threads.length !== ids.length) {
      throw new NotFoundException("One or more threads not found");
    }

    const map: Record<
      BulkAction,
      Partial<ThreadUserState> | "read" | "unread"
    > = {
      star: { isStarred: true },
      unstar: { isStarred: false },
      pin: { isPinned: true },
      unpin: { isPinned: false },
      archive: { isArchived: true },
      unarchive: { isArchived: false },
      spam: { isSpam: true },
      unspam: { isSpam: false },
      mute: { isMuted: true },
      unmute: { isMuted: false },
      trash: { isTrashed: true },
      untrash: { isTrashed: false },
      "mark-unread": "unread",
      "mark-read": "read",
    };
    const op = map[action];
    for (const id of ids) {
      if (op === "read") await this.markRead(id, userId);
      else if (op === "unread") await this.markUnread(id, userId);
      else await this.upsertState(id, userId, op);
    }
    return { updated: ids.length };
  }
}

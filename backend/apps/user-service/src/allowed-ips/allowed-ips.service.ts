import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllowedIp } from './entities/allowed-ip.entity';
import { User } from '../user/entities/user.entity';
import { coversAddress, rangesOverlap } from './ip-range.util';
import {
  AUDIT_ACTIONS,
  AuditContext,
  AuditService,
} from '../audit/audit.service';
import {
  CreateAllowedIpDto,
  UpdateAllowedIpDto,
} from './dto/create-allowed-ip.dto';

/** Postgres unique-violation. */
const UNIQUE_VIOLATION = '23505';

/**
 * Per-account ceiling on allow-list entries.
 *
 * The bulk DTO caps one request at 500, which bounds a single import but not
 * the account — repeat it and the list grows without limit. Every entry is read
 * and compared on each add and on both lockout guards, so an unbounded list is
 * work the account does to itself on every call.
 */
const MAX_ALLOWED_IPS_PER_ACCOUNT = 1000;

/** Reads as "1,000" in the messages people actually see. */
const MAX_ENTRIES_LABEL = MAX_ALLOWED_IPS_PER_ACCOUNT.toLocaleString('en-US');

@Injectable()
export class AllowedIpsService {
  constructor(
    @InjectRepository(AllowedIp)
    private readonly repo: Repository<AllowedIp>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  /** Whether the caller currently has IP restriction switched on. */
  private async isRestrictionEnabled(userId: string): Promise<boolean> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, ipRestrictionEnabled: true },
    });
    return user?.ipRestrictionEnabled === true;
  }

  /** Newest first, matching the order the screen adds entries in. */
  list(userId: string): Promise<AllowedIp[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  /**
   * Every existing entry for the account, which both the cap and the overlap
   * check need. Bounded by MAX_ALLOWED_IPS_PER_ACCOUNT, and only two short
   * columns wide.
   */
  private listForComparison(
    userId: string,
  ): Promise<Pick<AllowedIp, 'id' | 'address'>[]> {
    return this.repo.find({
      where: { userId },
      select: { id: true, address: true },
    });
  }

  /**
   * Refuses an entry that covers addresses an existing one already covers.
   *
   * The unique constraint only catches the same text twice, so until now
   * `10.0.0.0 - 10.0.0.255` and `10.0.0.5` both saved silently and neither
   * mentioned the other. The decision was that overlaps are explained rather
   * than silently merged or silently rejected, so the message names the entry
   * that is in the way — being told "that overlaps something" without being
   * told what leaves you to diff the list by hand.
   */
  private assertNoOverlap(
    address: string,
    existing: Pick<AllowedIp, 'id' | 'address'>[],
    excludeId?: string,
  ): void {
    const conflict = existing.find(
      (entry) => entry.id !== excludeId && rangesOverlap(entry.address, address),
    );
    if (conflict) {
      throw new ConflictException(
        `${address} overlaps ${conflict.address}, which is already on your list. Edit or remove that entry first, or add a narrower range.`,
      );
    }
  }

  async create(
    userId: string,
    dto: CreateAllowedIpDto,
    ctx?: AuditContext,
  ): Promise<AllowedIp> {
    const address = dto.address.trim();

    const existing = await this.listForComparison(userId);
    if (existing.length >= MAX_ALLOWED_IPS_PER_ACCOUNT) {
      throw new ConflictException(
        `Your allowed IP list is limited to ${MAX_ENTRIES_LABEL} entries and is full. Remove an entry before adding another.`,
      );
    }
    if (existing.some((entry) => entry.address === address)) {
      throw new ConflictException(`${address} is already on your list`);
    }
    this.assertNoOverlap(address, existing);

    try {
      const saved = await this.repo.save(
        this.repo.create({
          userId,
          address,
          description: dto.description?.trim() || null,
        }),
      );
      if (ctx) {
        await this.audit.record(AUDIT_ACTIONS.ALLOWED_IP_ADDED, userId, ctx, {
          entryId: saved.id,
          address,
        });
      }
      return saved;
    } catch (err: any) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(`${address} is already on your list`);
      }
      throw err;
    }
  }

  /**
   * CSV import. Addresses already on the list are reported rather than
   * rejected: an import of 200 rows that fails because one was already there
   * would make the user diff the file by hand.
   */
  async createMany(
    userId: string,
    entries: CreateAllowedIpDto[],
    ctx?: AuditContext,
  ): Promise<{
    created: AllowedIp[];
    skipped: string[];
    overlapping: { address: string; conflictsWith: string }[];
  }> {
    const seen = new Set<string>();
    const deduped: CreateAllowedIpDto[] = [];
    for (const entry of entries) {
      const address = entry.address.trim();
      if (seen.has(address)) continue;
      seen.add(address);
      deduped.push({ ...entry, address });
    }

    const existing = await this.listForComparison(userId);
    const existingAddresses = new Set(existing.map((e) => e.address));

    // An overlap here is reported rather than thrown, for the same reason a
    // duplicate is: failing a 200-row import on one bad row makes the user
    // find it by hand. Rows are checked against what is already stored *and*
    // against the rows already accepted from this same file, because a CSV can
    // perfectly well contain two ranges that overlap each other.
    const skipped: string[] = [];
    const overlapping: { address: string; conflictsWith: string }[] = [];
    const toCreate: CreateAllowedIpDto[] = [];

    for (const entry of deduped) {
      if (existingAddresses.has(entry.address)) {
        skipped.push(entry.address);
        continue;
      }
      const conflict =
        existing.find((e) => rangesOverlap(e.address, entry.address)) ??
        toCreate.find((e) => rangesOverlap(e.address, entry.address));
      if (conflict) {
        overlapping.push({
          address: entry.address,
          conflictsWith: conflict.address,
        });
        continue;
      }
      toCreate.push(entry);
    }

    // Checked against what would actually be written, so an import made
    // entirely of duplicates never fails on a cap it does not reach.
    if (existing.length + toCreate.length > MAX_ALLOWED_IPS_PER_ACCOUNT) {
      throw new ConflictException(
        `Your allowed IP list is limited to ${MAX_ENTRIES_LABEL} entries. You have ${existing.length} and this would add ${toCreate.length}. Remove some entries, or import fewer.`,
      );
    }

    const created = toCreate.length
      ? await this.repo.save(
          toCreate.map((entry) =>
            this.repo.create({
              userId,
              address: entry.address,
              description: entry.description?.trim() || null,
            }),
          ),
        )
      : [];

    // One record for the import, not one per address — a 500-row CSV should
    // not produce 500 audit rows. The addresses are in the metadata.
    if (ctx && created.length > 0) {
      await this.audit.record(AUDIT_ACTIONS.ALLOWED_IP_BULK_ADDED, userId, ctx, {
        addedCount: created.length,
        addresses: created.map((e) => e.address),
        skippedCount: skipped.length,
        overlappingCount: overlapping.length,
      });
    }

    return { created, skipped, overlapping };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAllowedIpDto,
    ctx?: AuditContext,
  ): Promise<AllowedIp> {
    const entry = await this.repo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Allowed IP not found');

    const previousAddress = entry.address;

    if (dto.address !== undefined) {
      const address = dto.address.trim();
      if (address !== previousAddress) {
        const existing = await this.listForComparison(userId);
        if (existing.some((e) => e.id !== id && e.address === address)) {
          throw new ConflictException(`${address} is already on your list`);
        }
        // Excluding this row: an entry always overlaps itself, and a
        // description-only edit must not start failing because of it.
        this.assertNoOverlap(address, existing, id);
      }
      entry.address = address;
    }
    if (dto.description !== undefined) {
      entry.description = dto.description.trim() || null;
    }

    try {
      const saved = await this.repo.save(entry);
      if (ctx) {
        await this.audit.record(AUDIT_ACTIONS.ALLOWED_IP_UPDATED, userId, ctx, {
          entryId: id,
          previousAddress,
          address: saved.address,
        });
      }
      return saved;
    } catch (err: any) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          `${entry.address} is already on your list`,
        );
      }
      throw err;
    }
  }

  /**
   * Refuses to delete the last entry covering the caller while restriction is
   * on — that single request is the difference between managing a list and
   * being locked out of the account with no way back in.
   *
   * Only guards while restriction is actually enabled. With it off the list
   * governs nothing, so deleting freely is correct; the enable path below is
   * what re-checks before it can start mattering.
   */
  async remove(
    userId: string,
    id: string,
    callerIp: string | null,
    ctx?: AuditContext,
  ): Promise<void> {
    const entry = await this.repo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Allowed IP not found');

    if (await this.isRestrictionEnabled(userId)) {
      if (!callerIp) {
        throw new ConflictException(
          'Your current IP address could not be determined, so this entry cannot be removed safely while IP restriction is on.',
        );
      }
      if (coversAddress(entry.address, callerIp)) {
        const others = await this.repo.find({
          where: { userId },
          select: { id: true, address: true },
        });
        const stillCovered = others.some(
          (other) =>
            other.id !== id && coversAddress(other.address, callerIp),
        );
        if (!stillCovered) {
          throw new ConflictException(
            `This is the only entry covering your current address (${callerIp}). Removing it while IP restriction is on would lock you out. Add another entry first, or switch IP restriction off.`,
          );
        }
      }
    }

    await this.repo.delete({ id, userId });

    if (ctx) {
      await this.audit.record(AUDIT_ACTIONS.ALLOWED_IP_REMOVED, userId, ctx, {
        entryId: id,
        address: entry.address,
        description: entry.description ?? null,
      });
    }
  }

  /**
   * Switching restriction on is refused unless the caller's own address is
   * already on the list — otherwise the request that enables it is the last one
   * that gets through.
   *
   * Switching off is never guarded; it can only widen access.
   */
  async setRestrictionEnabled(
    userId: string,
    enabled: boolean,
    callerIp: string | null,
    ctx?: AuditContext,
  ): Promise<{ enabled: boolean }> {
    if (enabled) {
      if (!callerIp) {
        throw new ConflictException(
          'Your current IP address could not be determined, so IP restriction cannot be switched on safely.',
        );
      }
      const entries = await this.repo.find({
        where: { userId },
        select: { id: true, address: true },
      });
      const covered = entries.some((entry) =>
        coversAddress(entry.address, callerIp),
      );
      if (!covered) {
        throw new ConflictException(
          `Your current address (${callerIp}) is not on the allowed list. Add it before switching IP restriction on, or you will be locked out.`,
        );
      }
    }

    await this.users.update({ id: userId }, { ipRestrictionEnabled: enabled });

    if (ctx) {
      await this.audit.record(
        enabled
          ? AUDIT_ACTIONS.IP_RESTRICTION_ENABLED
          : AUDIT_ACTIONS.IP_RESTRICTION_DISABLED,
        userId,
        ctx,
        { coveredBy: callerIp ?? null },
      );
    }

    return { enabled };
  }
}

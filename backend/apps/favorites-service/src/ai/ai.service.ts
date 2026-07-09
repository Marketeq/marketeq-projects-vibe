import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { FavoriteType } from '../entities/favorite.entity';
import {
  LISTING_OWNER_TARGET_CLIENT,
  OwnerTargetClientPort,
  USER_OWNER_TARGET_CLIENT,
} from '../services/owner-target-client.port';
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

interface ItemMetadata {
  title: string;
  skills: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private hf?: HfInference;
  private readonly modelId: string;
  private readonly similarityThreshold: number;
  private readonly embeddingCache = new Map<string, number[]>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(FavoriteGroup)
    private readonly groupRepo: Repository<FavoriteGroup>,
    @Optional()
    @Inject(LISTING_OWNER_TARGET_CLIENT)
    private readonly listingClient?: OwnerTargetClientPort,
    @Optional()
    @Inject(USER_OWNER_TARGET_CLIENT)
    private readonly userClient?: OwnerTargetClientPort,
  ) {
    this.modelId =
      this.configService.get<string>('HF_EMBEDDING_MODEL') ||
      'sentence-transformers/all-MiniLM-L6-v2';
    this.similarityThreshold = Number(
      this.configService.get<string>('AI_GROUP_SIMILARITY_THRESHOLD') || 0.75,
    );
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    if (apiKey) {
      this.hf = new HfInference(apiKey);
    }
  }

  async assignGroup(
    userId: string,
    type: FavoriteType,
    itemId: string,
  ): Promise<FavoriteGroup> {
    const metadata = await this.fetchItemMetadata(type, itemId);
    const candidateLabel = this.pickCandidateLabel(type, metadata);
    const groups = await this.groupRepo.find({ where: { userId, defaultType: type as any } });

    if (groups.length === 0) {
      return this.groupRepo.save(
        this.groupRepo.create({
          userId,
          name: candidateLabel,
          defaultType: type,
        } as any),
      ) as unknown as Promise<FavoriteGroup>;
    }

    const itemVector = await this.getEmbedding(this.toEmbeddingText(metadata));
    if (!itemVector) {
      return this.fallbackGroupForType(userId, type, candidateLabel);
    }

    let best: { group: FavoriteGroup; score: number } | null = null;
    for (const group of groups) {
      const groupVector = await this.getEmbedding(group.name);
      if (!groupVector) continue;
      const score = cosineSimilarity(itemVector, groupVector);
      if (!best || score > best.score) {
        best = { group, score };
      }
    }

    if (best && best.score >= this.similarityThreshold) {
      return best.group;
    }

    return this.groupRepo.save(
      this.groupRepo.create({
        userId,
        name: candidateLabel,
        defaultType: type,
      } as any),
    ) as unknown as Promise<FavoriteGroup>;
  }

  private async fetchItemMetadata(
    type: FavoriteType,
    itemId: string,
  ): Promise<ItemMetadata> {
    const payload = { targetType: type, targetId: itemId };
    const ownerClient =
      type === FavoriteType.PROJECT ||
      type === FavoriteType.SERVICE ||
      type === FavoriteType.JOB
        ? this.listingClient
        : this.userClient;

    if (!ownerClient) {
      return {
        title: `${this.getDefaultGroupName(type)} item`,
        skills: [],
      };
    }

    try {
      return await ownerClient.getTargetMetadata(payload);
    } catch (error) {
      this.logger.warn(
        `Metadata lookup failed for ${type}:${itemId}, using fallback title`,
      );
      return {
        title: `${this.getDefaultGroupName(type)} item`,
        skills: [],
      };
    }
  }

  private pickCandidateLabel(
    type: FavoriteType,
    metadata: ItemMetadata,
  ): string {
    const label = metadata.title?.trim();
    if (label && label.length > 0) {
      return label.slice(0, 100);
    }
    return this.getDefaultGroupName(type);
  }

  private async fallbackGroupForType(
    userId: string,
    type: FavoriteType,
    preferredName?: string,
  ): Promise<FavoriteGroup> {
    const fallbackName = preferredName || this.getDefaultGroupName(type);
    const existingGroup = await this.groupRepo.findOne({
      where: { userId, name: fallbackName, defaultType: type as any },
    });
    if (existingGroup) {
      return existingGroup;
    }
    return this.groupRepo.save(
      this.groupRepo.create({
        userId,
        name: fallbackName,
        defaultType: type,
      } as any),
    ) as unknown as Promise<FavoriteGroup>;
  }

  private toEmbeddingText(metadata: ItemMetadata): string {
    return [metadata.title, ...(metadata.skills || [])]
      .filter(Boolean)
      .join(' ');
  }

  private async getEmbedding(text: string): Promise<number[] | null> {
    if (!text || text.trim().length === 0) {
      return null;
    }
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text) || null;
    }
    if (!this.hf) {
      return null;
    }

    try {
      const response = await this.hf.featureExtraction({
        model: this.modelId,
        inputs: text,
      });
      const vector = Array.isArray(response[0])
        ? ((response as number[][])[0] as number[])
        : (response as number[]);
      this.embeddingCache.set(text, vector);
      return vector;
    } catch {
      return null;
    }
  }

  private getDefaultGroupName(type: FavoriteType): string {
    switch (type) {
      case FavoriteType.PROJECT:
        return 'Projects';
      case FavoriteType.SERVICE:
        return 'Services';
      case FavoriteType.JOB:
        return 'Jobs';
      case FavoriteType.TALENT:
        return 'Talents';
      case FavoriteType.TEAM:
        return 'Teams';
      default:
        return 'General';
    }
  }
}

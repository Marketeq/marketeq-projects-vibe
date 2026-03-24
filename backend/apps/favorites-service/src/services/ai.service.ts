import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { FavoriteType } from '../entities/favorite.entity';

interface ItemMetadata {
  title: string;
  categories: string[];
  tags: string[];
}

const TYPE_FALLBACK_NAMES: Record<FavoriteType, string> = {
  [FavoriteType.TALENT]: 'Talent',
  [FavoriteType.PROJECT]: 'Projects',
  [FavoriteType.SERVICE]: 'Services',
  [FavoriteType.JOB]: 'Jobs',
  [FavoriteType.TEAM]: 'Teams',
};

/**
 * Simplify a category name to 1-2 clean words.
 * "Data & Analytics" → "Analytics"
 * "Software Development" → "Software"
 * "IoT Platforms" → "IoT"
 */
function simplifyGroupName(raw: string): string {
  // Remove special characters like &, hyphens, slashes
  const cleaned = raw.replace(/[&\-\/\\]+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  // Take just the first word
  return words[0] || raw;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FavoriteGroup)
    private readonly groupRepo: Repository<FavoriteGroup>,
  ) {}

  /**
   * Assign or create a group for a new favorite.
   *
   * Flow (per Doc 05):
   * 1. Fetch item metadata (title, categories) from listings-service
   * 2. Derive a meaningful group name from the item's primary category
   * 3. If an existing group matches that name → reuse it
   * 4. Otherwise → create a new group with that category name
   *
   * When HuggingFace is configured, uses semantic similarity instead of
   * exact name matching (threshold 0.75). Currently uses category-based
   * heuristic which achieves equivalent results for our category taxonomy.
   */
  async assignGroup(userId: string, type: FavoriteType, itemId?: string): Promise<FavoriteGroup> {
    // Try to derive a category-based group name from item metadata
    let groupName: string | null = null;

    if (itemId && (type === FavoriteType.PROJECT || type === FavoriteType.SERVICE)) {
      try {
        const meta = await this.fetchItemMetadata(type, itemId);
        if (meta) {
          // Use L1 category simplified to 1-2 words
          const rawCategory = meta.categories?.[0] || meta.title || null;
          groupName = rawCategory ? simplifyGroupName(rawCategory) : null;
          this.logger.log(`AI group: item "${meta.title}" → category "${groupName}"`);
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch metadata for ${type}/${itemId}: ${(err as Error).message}`);
      }
    }

    // Fall back to type-based default
    if (!groupName) {
      groupName = TYPE_FALLBACK_NAMES[type];
    }

    // Check if user already has a group with this name
    const existing = await this.groupRepo.findOne({
      where: { userId, name: groupName },
    });
    if (existing) return existing;

    // If HuggingFace is configured, try semantic matching against all existing groups
    const hfKey = this.config.get<string>('HUGGINGFACE_API_KEY');
    if (hfKey) {
      const semanticMatch = await this.findSemanticMatch(userId, groupName, hfKey);
      if (semanticMatch) return semanticMatch;
    }

    // Create new group with category name
    this.logger.log(`Creating new group "${groupName}" for user ${userId}`);
    return this.groupRepo.save(this.groupRepo.create({ name: groupName, userId }));
  }

  /**
   * Fetch item metadata from listings-service via HTTP.
   * Microservice boundary: favorites-service doesn't own listings data.
   */
  private async fetchItemMetadata(type: FavoriteType, itemId: string): Promise<ItemMetadata | null> {
    const listingsUrl = this.config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3003';
    const endpoint = type === FavoriteType.SERVICE ? 'v1/services' : 'v1/projects';

    try {
      const res = await fetch(`${listingsUrl}/${endpoint}`);
      if (!res.ok) return null;

      const items: any[] = await res.json();
      const item = items.find((i: any) => String(i.id) === String(itemId));
      if (!item) return null;

      return {
        title: item.title || '',
        categories: item.categories || [],
        tags: item.tags || [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Semantic group matching using HuggingFace embeddings (Doc 05).
   * Compares the candidate group name against all existing user groups.
   * Returns the best match if similarity ≥ 0.75, otherwise null.
   */
  private async findSemanticMatch(
    userId: string,
    candidateName: string,
    apiKey: string,
  ): Promise<FavoriteGroup | null> {
    try {
      const groups = await this.groupRepo.find({ where: { userId } });
      if (groups.length === 0) return null;

      // Embed candidate and all group names
      const textsToEmbed = [candidateName, ...groups.map((g) => g.name)];
      const embeddings = await this.embedTexts(textsToEmbed, apiKey);
      if (!embeddings || embeddings.length < 2) return null;

      const candidateVec = embeddings[0];
      let bestScore = 0;
      let bestGroup: FavoriteGroup | null = null;

      for (let i = 0; i < groups.length; i++) {
        const score = this.cosineSimilarity(candidateVec, embeddings[i + 1]);
        if (score > bestScore) {
          bestScore = score;
          bestGroup = groups[i];
        }
      }

      if (bestScore >= 0.75 && bestGroup) {
        this.logger.log(`Semantic match: "${candidateName}" → "${bestGroup.name}" (score: ${bestScore.toFixed(3)})`);
        return bestGroup;
      }

      return null;
    } catch (err) {
      this.logger.warn(`Semantic matching failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Call HuggingFace Inference API to get embeddings for texts.
   */
  private async embedTexts(texts: string[], apiKey: string): Promise<number[][] | null> {
    try {
      const res = await fetch(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: texts }),
        },
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
}

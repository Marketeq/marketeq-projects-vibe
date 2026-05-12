import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, In } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import {
  AutocompleteEntry,
  EntryStatus,
  EntryType,
} from "./entities/autocomplete-entry.entity";
import {
  AutocompleteReviewQueue,
  ReviewAction,
} from "./entities/autocomplete-review-queue.entity";
import { AutocompleteCategory } from "./entities/autocomplete-category.entity";
import { AutocompleteRejectedEntry } from "./entities/autocomplete-rejected-entry.entity";
import { SubmitAutocompleteDto } from "./dto/submit-autocomplete.dto";
import { ReviewAutocompleteDto } from "./dto/review-autocomplete.dto";
import { QueryAutocompleteDto } from "./dto/query-autocomplete.dto";
import { EntryFilter } from "./filters/entry.filter";

const FuseLib: any = require("fuse.js");

/** Set of types that have corresponding JSON data files */
const JSON_DATA_TYPES = new Set([
  "skills",
  "job_titles",
  "certifications",
  "industries",
  "languages",
  "project_types",
  "search_keywords",
]);

function resolveAutocompleteDataPath(type: string): string | null {
  const candidates = [
    path.resolve(
      process.cwd(),
      "apps/autocomplete-service/data/autocomplete",
      `${type}.json`,
    ),
    path.resolve(__dirname, "../data/autocomplete", `${type}.json`),
    path.resolve(__dirname, "../../data/autocomplete", `${type}.json`),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

// Heuristic keyword-to-category mapping
const CATEGORY_RULES: Record<string, string[]> = {
  tech: [
    "engineer",
    "developer",
    "backend",
    "frontend",
    "fullstack",
    "blockchain",
    "devops",
    "cloud",
    "software",
    "programming",
    "coding",
    "api",
    "database",
    "ml",
    "ai",
    "data",
  ],
  design: [
    "designer",
    "ux",
    "ui",
    "graphic",
    "visual",
    "brand",
    "illustration",
    "motion",
    "figma",
    "sketch",
    "photoshop",
  ],
  marketing: [
    "seo",
    "growth",
    "media",
    "content",
    "marketing",
    "advertising",
    "social",
    "email",
    "campaign",
    "analytics",
    "ppc",
  ],
  finance: [
    "accountant",
    "finance",
    "financial",
    "bookkeeping",
    "tax",
    "audit",
    "cfo",
    "budget",
    "payroll",
    "investment",
  ],
  legal: [
    "attorney",
    "paralegal",
    "compliance",
    "legal",
    "lawyer",
    "contract",
    "intellectual",
    "litigation",
  ],
  writing: [
    "writer",
    "copywriter",
    "editor",
    "proofreader",
    "journalist",
    "blogger",
    "content",
    "technical",
    "ghostwriter",
  ],
  management: [
    "manager",
    "director",
    "executive",
    "lead",
    "head",
    "chief",
    "vp",
    "president",
    "founder",
    "ceo",
    "cto",
    "coo",
  ],
  sales: [
    "sales",
    "business",
    "account",
    "revenue",
    "customer",
    "client",
    "partnerships",
    "crm",
    "pipeline",
  ],
  hr: [
    "recruiter",
    "talent",
    "hr",
    "human",
    "resources",
    "onboarding",
    "training",
    "culture",
    "hiring",
  ],
  education: [
    "teacher",
    "instructor",
    "tutor",
    "professor",
    "curriculum",
    "training",
    "coach",
    "mentor",
    "educator",
  ],
  healthcare: [
    "medical",
    "health",
    "doctor",
    "nurse",
    "clinical",
    "pharma",
    "biotech",
    "therapy",
    "wellness",
  ],
};

function assignHeuristicCategory(label: string): string | null {
  const terms = label.toLowerCase().split(/[\s\-_]/);
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some((k) => terms.includes(k))) {
      return category;
    }
  }
  return null;
}

const AUTOCOMPLETE_ROUTE_TYPE_MAP: Partial<Record<string, EntryType>> = {
  skills: EntryType.SKILL,
  job_titles: EntryType.TITLE,
  languages: EntryType.LANGUAGE,
  certifications: EntryType.CERTIFICATION,
  industries: EntryType.INDUSTRY,
  project_types: EntryType.PROJECT_TYPE,
};

type PendingReviewEntry = {
  id: string;
  value: string;
  normalized: string;
  type: EntryType;
  status: EntryStatus;
  source: string | null;
  category: string | null;
  subcategory: string | null;
};

type PendingReviewItem = {
  id: string;
  entryId: string;
  reviewedBy: string | null;
  action: ReviewAction | null;
  reason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  entry: PendingReviewEntry | null;
};

@Injectable()
export class AutocompleteService {
  constructor(
    private readonly http: HttpService,
    @InjectRepository(AutocompleteEntry)
    private readonly entryRepo: Repository<AutocompleteEntry>,
    @InjectRepository(AutocompleteReviewQueue)
    private readonly reviewRepo: Repository<AutocompleteReviewQueue>,
    @InjectRepository(AutocompleteCategory)
    private readonly categoryRepo: Repository<AutocompleteCategory>,
    @InjectRepository(AutocompleteRejectedEntry)
    private readonly rejectedRepo: Repository<AutocompleteRejectedEntry>,
    private readonly filter: EntryFilter,
  ) {}

  async getCategoryMatches(query: string): Promise<
    {
      value: string;
      uuid: string;
      type: "category" | "subcategory";
    }[]
  > {
    const trimmedQuery = (query ?? "").trim();
    if (!trimmedQuery) {
      throw new BadRequestException("Query parameter q is required");
    }

    const liveCategories = await this.fetchLiveCategories(trimmedQuery);
    if (liveCategories.length > 0) {
      return liveCategories;
    }

    return this.queryCategoryRepo(trimmedQuery);
  }

  async submit(dto: SubmitAutocompleteDto): Promise<AutocompleteEntry> {
    dto.type = AUTOCOMPLETE_ROUTE_TYPE_MAP[dto.type] ?? dto.type;
    const validation = this.filter.validate(dto.value);
    if (!validation.valid) {
      // Log the rejected entry
      await this.rejectedRepo.save(
        this.rejectedRepo.create({
          value: dto.value.trim(),
          normalized: this.filter.normalize(dto.value),
          type: dto.type,
          reason: validation.reason!,
          source: dto.source,
        }),
      );
      throw new BadRequestException(`Invalid entry: ${validation.reason}`);
    }

    const normalized = this.filter.normalize(dto.value);

    // Deduplicate
    const existing = await this.entryRepo.findOne({
      where: { normalized, type: dto.type },
    });

    if (existing) {
      existing.frequency += 1;
      if (existing.status === EntryStatus.APPROVED) {
        return this.entryRepo.save(existing);
      }
      return existing;
    }

    // Assign category via heuristic matching
    const category = assignHeuristicCategory(dto.value);

    const entry = this.entryRepo.create({
      value: dto.value.trim(),
      normalized,
      type: dto.type,
      status: EntryStatus.PENDING,
      source: dto.source,
      frequency: 1,
      category: category ?? undefined,
    });

    const saved = await this.entryRepo.save(entry);

    // Add to review queue
    await this.reviewRepo.save(this.reviewRepo.create({ entryId: saved.id }));

    return saved;
  }

  async query(dto: QueryAutocompleteDto): Promise<AutocompleteEntry[]> {
    dto.type = AUTOCOMPLETE_ROUTE_TYPE_MAP[dto.type] ?? dto.type;
    const limit = dto.limit ?? 10;
    const normalizedQ = this.filter.normalize(dto.q);

    // Load approved entries for this type to run Fuse.js fuzzy search
    const candidates = await this.entryRepo.find({
      where: { type: dto.type, status: EntryStatus.APPROVED },
      order: { frequency: "DESC" },
      take: 500, // cap for in-memory search
    });

    if (candidates.length === 0) return [];

    const fuse = new FuseLib(candidates, {
      keys: ["normalized", "value"],
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(normalizedQ, { limit });
    return results.map((r: { item: AutocompleteEntry }) => r.item);
  }

  async getByType(type: EntryType): Promise<AutocompleteEntry[]> {
    type = AUTOCOMPLETE_ROUTE_TYPE_MAP[type] ?? type;
    return this.entryRepo.find({
      where: { type, status: EntryStatus.APPROVED },
      order: { frequency: "DESC" },
      take: 100,
    });
  }

  async getCategoryMap(): Promise<Record<string, string[]>> {
    const entries = await this.entryRepo
      .createQueryBuilder("e")
      .select(["e.category", "e.type"])
      .where("e.status = :status", { status: EntryStatus.APPROVED })
      .andWhere("e.category IS NOT NULL")
      .distinct(true)
      .getRawMany();

    return entries.reduce(
      (map, row) => {
        const cat = row.e_category;
        const type = row.e_type;
        if (!map[cat]) map[cat] = [];
        if (!map[cat].includes(type)) map[cat].push(type);
        return map;
      },
      {} as Record<string, string[]>,
    );
  }

  async review(dto: ReviewAutocompleteDto): Promise<AutocompleteEntry> {
    const entry = await this.entryRepo.findOne({ where: { id: dto.entryId } });
    if (!entry) throw new NotFoundException("Entry not found");

    entry.status =
      dto.action === ReviewAction.APPROVE
        ? EntryStatus.APPROVED
        : EntryStatus.REJECTED;

    await this.entryRepo.save(entry);

    const queueItem = await this.reviewRepo.findOne({
      where: { entryId: dto.entryId },
    });
    if (queueItem) {
      queueItem.action = dto.action;
      queueItem.reason = dto.reason;
      queueItem.reviewedBy = dto.reviewedBy || "";
      queueItem.reviewedAt = new Date();
      await this.reviewRepo.save(queueItem);
    }

    // If rejected, log to rejected entries table
    if (dto.action === ReviewAction.REJECT) {
      await this.rejectedRepo.save(
        this.rejectedRepo.create({
          value: entry.value,
          normalized: entry.normalized,
          type: entry.type,
          reason: dto.reason,
          source: entry.source,
        }),
      );
    }

    return entry;
  }

  async getPendingReview(): Promise<PendingReviewItem[]> {
    const queueItems = await this.reviewRepo.find({
      where: { action: IsNull() },
      order: { createdAt: "DESC" },
      take: 50,
    });

    const entries =
      queueItems.length > 0
        ? await this.entryRepo.find({
            where: { id: In(queueItems.map((item) => item.entryId)) },
          })
        : [];
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

    return queueItems.map(
      (item): PendingReviewItem => ({
        id: item.id,
        entryId: item.entryId,
        reviewedBy: item.reviewedBy,
        action: item.action,
        reason: item.reason,
        createdAt: item.createdAt,
        reviewedAt: item.reviewedAt,
        entry: entriesById.get(item.entryId)
          ? {
              id: entriesById.get(item.entryId)!.id,
              value: entriesById.get(item.entryId)!.value,
              normalized: entriesById.get(item.entryId)!.normalized,
              type: entriesById.get(item.entryId)!.type,
              status: entriesById.get(item.entryId)!.status,
              source: entriesById.get(item.entryId)!.source,
              category: entriesById.get(item.entryId)!.category,
              subcategory: entriesById.get(item.entryId)!.subcategory,
            }
          : null,
      }),
    );
  }

  /**
   * Check whether a JSON data file exists for the given type.
   */
  hasJsonData(type: string): boolean {
    return JSON_DATA_TYPES.has(type);
  }

  /**
   * Query autocomplete data from a local JSON file using Fuse.js fuzzy search.
   * Falls back gracefully if the file does not exist.
   */
  async queryFromJson(
    type: string,
    q?: string,
    limit = 10,
  ): Promise<{ id: string; label: string }[]> {
    // Keep route type for JSON file resolution (e.g. "skills.json", "job_titles.json").
    // Map separately for DB enum-backed entries (e.g. skill, title).
    const routeType = type;
    const dbType = (AUTOCOMPLETE_ROUTE_TYPE_MAP[type] ?? type) as EntryType;
    const filepath = resolveAutocompleteDataPath(routeType);
    let approvedDbEntries: AutocompleteEntry[] = [];
    try {
      approvedDbEntries = await this.entryRepo.find({
        where: { type: dbType, status: EntryStatus.APPROVED },
        order: { frequency: "DESC", createdAt: "ASC" },
        take: 500,
      });
    } catch {
      // If the live DB schema is missing a newer enum value, still serve the
      // JSON-backed autocomplete list instead of failing the whole request.
      approvedDbEntries = [];
    }

    const approvedSuggestions = approvedDbEntries.map((entry) => ({
      id: entry.id,
      label: entry.value,
    }));

    let jsonSuggestions: { id: string; label: string }[] = [];
    if (filepath) {
      try {
        const raw = fs.readFileSync(filepath, "utf-8");
        jsonSuggestions = JSON.parse(raw);
      } catch {
        jsonSuggestions = [];
      }
    }

    const merged = Array.from(
      new Map(
        [...approvedSuggestions, ...jsonSuggestions].map(
          (item) => [this.filter.normalize(item.label), item] as const,
        ),
      ).values(),
    );

    if (!q || q.trim() === "") {
      return merged.slice(0, limit);
    }

    const fuse = new FuseLib(merged, { keys: ["label"], threshold: 0.3 });
    return fuse
      .search(q, { limit })
      .map((r: { item: { id: string; label: string } }) => r.item);
  }

  private async fetchLiveCategories(query: string): Promise<
    {
      value: string;
      uuid: string;
      type: "category" | "subcategory";
    }[]
  > {
    const categoryServiceUrl = (
      process.env.CATEGORY_SERVICE_URL || "http://localhost:3023"
    ).replace(/\/$/, "");

    try {
      const response = await this.http.axiosRef.get(
        `${categoryServiceUrl}/api/categories/tree`,
        {
          timeout: 5000,
        },
      );
      const nodes = Array.isArray(response.data) ? response.data : [];
      const flattened = this.flattenCategoryTree(nodes);
      return this.searchCategoryResults(flattened, query);
    } catch {
      return [];
    }
  }

  private queryCategoryRepo(query: string):
    | {
        value: string;
        uuid: string;
        type: "category" | "subcategory";
      }[]
    | Promise<
        {
          value: string;
          uuid: string;
          type: "category" | "subcategory";
        }[]
      > {
    return this.categoryRepo
      .find({
        where: { isActive: true },
        order: { name: "ASC" },
        take: 500,
      })
      .then((rows) =>
        this.searchCategoryResults(
          rows.map((row) => ({
            value: row.name,
            uuid: row.id,
            type: row.parentSlug
              ? ("subcategory" as const)
              : ("category" as const),
          })),
          query,
        ),
      );
  }

  private flattenCategoryTree(
    nodes: Array<{
      uuid: string;
      name: string;
      approved?: boolean;
      children?: any[];
    }>,
    depth = 0,
  ): {
    value: string;
    uuid: string;
    type: "category" | "subcategory";
  }[] {
    return nodes.flatMap((node) => {
      const children = Array.isArray(node.children) ? node.children : [];
      const descendants = this.flattenCategoryTree(children, depth + 1);
      if (!node?.approved) {
        return descendants;
      }

      return [
        {
          value: node.name,
          uuid: node.uuid,
          type: depth === 0 ? ("category" as const) : ("subcategory" as const),
        },
        ...descendants,
      ];
    });
  }

  private searchCategoryResults(
    values: Array<{
      value: string;
      uuid: string;
      type: "category" | "subcategory";
    }>,
    query: string,
  ): {
    value: string;
    uuid: string;
    type: "category" | "subcategory";
  }[] {
    const uniqueValues = Array.from(
      new Map(
        values.map((value) => [`${value.type}:${value.uuid}`, value]),
      ).values(),
    );

    const fuse = new FuseLib(uniqueValues, {
      keys: ["value"],
      threshold: 0.3,
      includeScore: true,
    });

    return fuse.search(query, { limit: 20 }).map(
      (result: {
        item: {
          value: string;
          uuid: string;
          type: "category" | "subcategory";
        };
      }) => result.item,
    );
  }
}

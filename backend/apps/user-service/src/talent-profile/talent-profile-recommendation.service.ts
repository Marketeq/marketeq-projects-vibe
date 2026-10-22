import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { firstValueFrom } from "rxjs";
import { Repository } from "typeorm";
import { RecommendTalentDto } from "./dto/recommend-talent.dto";
import { TalentProfile } from "./entities/talent-profile.entity";
import { TalentGateStateService, openTalentTextSql } from "../identity-gate/talent-gate-state.service";

type TalentRecommendation = {
  id: string;
  matchScore: number;
  matchedSkills: string[];
  reason: string;
};

type TalentRecommendationResponse = {
  aiStatus: "OK" | "AI_UNAVAILABLE" | "NO_TALENT";
  recommendations: Array<
    Pick<
      TalentProfile,
      | "id"
      | "username"
      | "name"
      | "avatarUrl"
      | "jobTitles"
      | "availability"
      | "location"
      | "country"
      | "timezone"
      | "rate"
      | "overview"
      | "skills"
      | "rating"
      | "reviewsCount"
      | "totalProjectsCompleted"
    > & {
      aiMatchScore: number;
      aiMatchedSkills: string[];
      aiReason: string;
    }
  >;
  message?: string;
};

const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const EXPERIENCE_LEVELS = [
  { label: "Student", min: 0, max: 2 },
  { label: "Junior", min: 2, max: 3 },
  { label: "Medior", min: 3, max: 5 },
  { label: "Senior", min: 5, max: 10 },
  { label: "Guru", min: 10, max: Number.POSITIVE_INFINITY },
];

@Injectable()
export class TalentProfileRecommendationService {
  private readonly logger = new Logger(TalentProfileRecommendationService.name);
  private readonly defaultApiUrl =
    "https://api.groq.com/openai/v1/chat/completions";

  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly gateState: TalentGateStateService,
  ) {}

  async recommend(
    dto: RecommendTalentDto,
  ): Promise<TalentRecommendationResponse> {
    const limit = dto.limit ?? 30;
    // G1: only talent whose gate is open are candidates. The gate is part of the query (a
    // semi-join on the locally kept last-known gate state), so the newest 80 candidates are
    // already the newest 80 VISIBLE profiles, in one query that reads only the columns the
    // ranking needs - a hidden talent's profile is never read, let alone sent to the ranking
    // model, and identity is not called. sourceId is the account id the gate is keyed on; it is
    // never returned. If the state table cannot be read, nobody is a candidate.
    let profiles: TalentProfile[] = [];
    try {
      profiles = await this.repo
        .createQueryBuilder("p")
        .select([
          "p.id",
          "p.username",
          "p.name",
          "p.avatarUrl",
          "p.jobTitles",
          "p.availability",
          "p.location",
          "p.country",
          "p.timezone",
          "p.rate",
          "p.overview",
          "p.skills",
          "p.rating",
          "p.reviewsCount",
          "p.totalProjectsCompleted",
          "p.updatedAt",
        ])
        .where("p.status = :status", { status: "active" })
        .andWhere(openTalentTextSql("p.sourceId"))
        .orderBy("p.updatedAt", "DESC")
        .addOrderBy("p.id", "ASC")
        .take(80)
        .getMany();
    } catch (err) {
      if (!this.gateState.isUnreadable(err)) throw err;
      this.gateState.warnUnreadable("talent recommendations", err);
    }
    const filteredProfiles = this.applyFilters(dto, profiles);

    if (filteredProfiles.length === 0) {
      return {
        aiStatus: "NO_TALENT",
        recommendations: [],
        message:
          profiles.length === 0
            ? "No active talent profiles are available to recommend."
            : "No active talent profiles match the selected filters.",
      };
    }

    try {
      const aiRecommendations = await this.rankWithAi(
        dto,
        filteredProfiles,
        limit,
      );

      return {
        aiStatus: "OK",
        recommendations: this.attachProfiles(
          filteredProfiles,
          aiRecommendations,
        ),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI recommendation failed.";
      this.logger.error(`talent_recommendation_failed reason=${message}`);
      const localRecommendations = this.rankLocally(
        dto,
        filteredProfiles,
        limit,
      );

      return {
        aiStatus: "AI_UNAVAILABLE",
        recommendations: this.attachProfiles(
          filteredProfiles,
          localRecommendations,
        ),
        message: `${message}. Showing filtered database matches until AI is available.`,
      };
    }
  }

  private attachProfiles(
    profiles: TalentProfile[],
    recommendations: TalentRecommendation[],
  ): TalentRecommendationResponse["recommendations"] {
    const profileById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );

    return recommendations
      .map((recommendation) => {
        const profile = profileById.get(recommendation.id);
        if (!profile) return null;

        return {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          jobTitles: profile.jobTitles,
          availability: profile.availability,
          location: profile.location,
          country: profile.country,
          timezone: profile.timezone,
          rate: profile.rate,
          overview: profile.overview,
          skills: profile.skills,
          rating: profile.rating,
          reviewsCount: profile.reviewsCount,
          totalProjectsCompleted: profile.totalProjectsCompleted,
          aiMatchScore: recommendation.matchScore,
          aiMatchedSkills: recommendation.matchedSkills,
          aiReason: recommendation.reason,
        };
      })
      .filter(
        (
          recommendation,
        ): recommendation is TalentRecommendationResponse["recommendations"][number] =>
          Boolean(recommendation),
      );
  }

  private applyFilters(
    dto: RecommendTalentDto,
    profiles: TalentProfile[],
  ): TalentProfile[] {
    return profiles.filter((profile) => {
      const roleMatch = this.roleMatches(profile, dto.roleTitle);
      const locationMatch =
        !dto.locations?.length ||
        dto.locations.some((location) =>
          this.locationMatches(profile, location),
        );
      const experienceMatch =
        !dto.experienceLevels?.length ||
        dto.experienceLevels.some(
          (level) =>
            this.getExperienceLevel(profile) === this.normalizeLevel(level),
        );
      const scheduleMatch =
        !dto.workSchedules?.length ||
        dto.workSchedules.some((schedule) =>
          this.scheduleMatches(profile, schedule),
        );
      const rateMatch =
        !dto.hourlyRate || this.rateMatches(profile.rate, dto.hourlyRate);

      return (
        roleMatch &&
        locationMatch &&
        experienceMatch &&
        scheduleMatch &&
        rateMatch
      );
    });
  }

  private rankLocally(
    dto: RecommendTalentDto,
    profiles: TalentProfile[],
    limit: number,
  ): TalentRecommendation[] {
    const requestedSkills = new Set(
      (dto.skills ?? []).map((skill) => skill.toLowerCase()),
    );
    const roleTokens = this.tokenize(dto.roleTitle);

    return profiles
      .map((profile) => {
        const profileSkills = profile.skills ?? [];
        const matchedSkills = profileSkills.filter((skill) =>
          requestedSkills.has(skill.toLowerCase()),
        );
        const profileText = [
          profile.name,
          profile.username,
          ...(profile.jobTitles ?? []).map((title) =>
            typeof title === "string" ? title : title.headline,
          ),
          profile.skills?.join(" "),
          this.stringifyOverview(profile.overview),
        ].join(" ");
        const roleMatches = roleTokens.filter((token) =>
          profileText.toLowerCase().includes(token),
        ).length;
        const score = Math.min(
          98,
          65 +
            matchedSkills.length * 5 +
            roleMatches * 8 +
            Math.min(10, Math.round(Number(profile.rating ?? 0) * 2)),
        );

        return {
          id: profile.id,
          matchScore: score,
          matchedSkills:
            matchedSkills.length > 0
              ? matchedSkills.slice(0, 12)
              : (profile.skills ?? []).slice(0, 6),
          reason: "Matched from active talent profile data.",
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  private async rankWithAi(
    dto: RecommendTalentDto,
    profiles: TalentProfile[],
    limit: number,
  ): Promise<TalentRecommendation[]> {
    const apiKey = this.config.get<string>("GROQ_API_KEY");
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const apiUrl =
      this.config.get<string>("GROQ_API_URL") ?? this.defaultApiUrl;
    const model = this.config.get<string>("GROQ_MODEL") ?? DEFAULT_GROQ_MODEL;
    const candidates = profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      titles: (profile.jobTitles ?? []).map((title) =>
        typeof title === "string" ? title : title.headline,
      ),
      country: profile.country ?? profile.location,
      rate: profile.rate,
      skills: profile.skills ?? [],
      rating: profile.rating,
      projects: profile.totalProjectsCompleted ?? profile.reviewsCount,
      overview: this.stringifyOverview(profile.overview),
    }));

    const response = await firstValueFrom(
      this.http.post(
        apiUrl,
        {
          model,
          max_tokens: 2048,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You recommend real talent profiles for a freelance marketplace job. Rank only candidates provided by id. Respond only with JSON: { "recommendations": [{ "id": "uuid", "matchScore": 0-100, "matchedSkills": ["skill"], "reason": "short reason" }] }. Do not invent candidate ids or profile details.',
            },
            {
              role: "user",
              content: JSON.stringify({
                job: {
                  roleTitle: dto.roleTitle,
                  workType: dto.workType,
                  description: dto.description,
                  deliverables: dto.deliverables,
                  successCriteria: dto.successCriteria,
                  skills: dto.skills ?? [],
                  filters: {
                    locations: dto.locations ?? [],
                    experienceLevels: dto.experienceLevels ?? [],
                    workSchedules: dto.workSchedules ?? [],
                    hourlyRate: dto.hourlyRate ?? "",
                  },
                },
                limit,
                candidates,
              }),
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 30_000,
        },
      ),
    );

    const raw = response.data?.choices?.[0]?.message?.content;
    const parsed = this.parseRecommendations(raw);
    return parsed.slice(0, limit);
  }

  private parseRecommendations(raw: unknown): TalentRecommendation[] {
    if (typeof raw !== "string" || !raw.trim()) {
      throw new Error("AI returned an empty recommendation response.");
    }

    const parsed = JSON.parse(raw) as {
      recommendations?: Partial<TalentRecommendation>[];
    };

    return (parsed.recommendations ?? [])
      .map((recommendation) => ({
        id: String(recommendation.id ?? ""),
        matchScore: Math.max(
          0,
          Math.min(100, Number(recommendation.matchScore ?? 0)),
        ),
        matchedSkills: Array.isArray(recommendation.matchedSkills)
          ? recommendation.matchedSkills
              .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
              .filter(Boolean)
              .slice(0, 12)
          : [],
        reason:
          typeof recommendation.reason === "string"
            ? recommendation.reason.slice(0, 180)
            : "",
      }))
      .filter((recommendation) => recommendation.id);
  }

  private stringifyOverview(overview: Record<string, unknown> | null): string {
    if (!overview) return "";
    return JSON.stringify(overview).slice(0, 500);
  }

  private locationMatches(profile: TalentProfile, location: string): boolean {
    const normalizedFilter = this.normalizeLocation(location);
    const normalizedProfileLocations = [profile.country, profile.location]
      .filter(Boolean)
      .map((value) => this.normalizeLocation(String(value)));

    return normalizedProfileLocations.some(
      (value) => value === normalizedFilter,
    );
  }

  private roleMatches(profile: TalentProfile, roleTitle: string): boolean {
    const requestedRole = this.normalizeTitle(roleTitle);
    if (!requestedRole) return true;

    const headlines = (profile.jobTitles ?? [])
      .map((title) => (typeof title === "string" ? title : (title.headline ?? "")))
      .map((headline) => this.normalizeTitle(headline))
      .filter((headline) => headline.length > 0);

    // A profile with no job title on file carries no signal either way, so the
    // role filter lets it through rather than disqualifying it outright. Every
    // other filter here already treats "nothing to compare" as a pass, and
    // ranking still sorts genuine title matches above these.
    if (!headlines.length) return true;

    return headlines.some(
      (headline) =>
        headline === requestedRole ||
        headline.includes(requestedRole) ||
        requestedRole.includes(headline),
    );
  }

  private scheduleMatches(profile: TalentProfile, schedule: string): boolean {
    const normalizedSchedule = schedule.toLowerCase();
    const normalizedAvailability = (profile.availability ?? "").toLowerCase();
    const overviewSchedule =
      typeof profile.overview?.workSchedule === "string"
        ? profile.overview.workSchedule.toLowerCase()
        : "";

    if (normalizedSchedule.includes("full")) {
      return (
        normalizedAvailability.includes("full") ||
        normalizedAvailability.includes("40") ||
        overviewSchedule.includes("full") ||
        overviewSchedule.includes("40")
      );
    }

    if (normalizedSchedule.includes("part")) {
      return (
        normalizedAvailability.includes("part") ||
        normalizedAvailability.includes("20") ||
        overviewSchedule.includes("part") ||
        overviewSchedule.includes("20")
      );
    }

    return Boolean(normalizedAvailability || overviewSchedule);
  }

  private rateMatches(rate: number | null, rateFilter: string): boolean {
    if (!rate) return false;
    if (rateFilter.includes("Up to")) return rate <= 20;
    if (rateFilter.includes("20-30")) return rate >= 20 && rate <= 30;
    if (rateFilter.includes("30-50")) return rate >= 30 && rate <= 50;
    if (rateFilter.includes("50-70")) return rate >= 50 && rate <= 70;
    return true;
  }

  private getExperienceLevel(profile: TalentProfile): string {
    const explicitLevel =
      typeof profile.overview?.experienceLevel === "string"
        ? profile.overview.experienceLevel
        : "";
    if (explicitLevel) return this.normalizeLevel(explicitLevel);

    const years = Number(profile.overview?.yearsOfExperience ?? NaN);
    if (!Number.isNaN(years)) {
      return (
        EXPERIENCE_LEVELS.find(
          (level) => years >= level.min && years <= level.max,
        )?.label ?? "Senior"
      );
    }

    return "Senior";
  }

  private normalizeLevel(value: string): string {
    const lower = value.toLowerCase();
    return (
      EXPERIENCE_LEVELS.find((level) =>
        lower.includes(level.label.toLowerCase()),
      )?.label ?? value
    );
  }

  private normalizeLocation(value: string): string {
    const lower = value.trim().toLowerCase();
    if (lower === "usa" || lower === "united states") return "united states";
    return lower;
  }

  private tokenize(value: string): string[] {
    return value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);
  }

  private normalizeTitle(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
}

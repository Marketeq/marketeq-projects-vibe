import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TalentProfile } from "./entities/talent-profile.entity";
import { Public } from "../decorators/public.decorator";
import { RecommendTalentDto } from "./dto/recommend-talent.dto";
import { TalentProfileRecommendationService } from "./talent-profile-recommendation.service";
import { TalentDiscoveryGateService } from "../identity-gate/talent-discovery-gate.service";

@Controller("public/talent")
export class TalentProfileController {
  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
    private readonly recommendationService: TalentProfileRecommendationService,
    private readonly discoveryGate: TalentDiscoveryGateService,
  ) {}

  private static readonly PUBLIC_FIELDS: (keyof TalentProfile)[] = [
    "id",
    "username",
    "name",
    "jobTitles",
    "availability",
    "location",
    "country",
    "timezone",
    "rate",
    "overview",
    "skills",
    "industryExpertise",
    "languages",
    "certifications",
    "education",
    "workExperience",
    "portfolio",
    "status",
    "rating",
    "reviewsCount",
    "totalProjectsCompleted",
    "repeatHireRate",
    "responseTimeHours",
    "memberSince",
    "createdAt",
    "updatedAt",
  ];

  @Public()
  @Post("recommendations")
  async recommendations(@Body() dto: RecommendTalentDto) {
    return this.recommendationService.recommend(dto);
  }

  @Public()
  @Get(":username")
  async getByUsername(@Param("username") username: string) {
    const profile = await this.repo.findOne({
      where: { username, status: "active" },
      select: TalentProfileController.PUBLIC_FIELDS,
    });
    if (!profile) {
      throw new NotFoundException(`Talent profile "${username}" not found`);
    }
    return profile;
  }

  @Public()
  @Get()
  async list(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const take = Math.min(limit, 100);

    // G1: the browse list contains only talent whose gate is open, and its
    // total and pages count only those. Visibility is decided from a light
    // (id, sourceId) scan of the WHOLE table in the original order (no scan
    // ceiling, so the total is exact), so a page is a slice of the
    // visible list rather than a filtered slice of the raw one; only the
    // visible page's profiles are then read. sourceId is the account id the
    // gate is keyed on and is never part of the response. A profile with no
    // sourceId has no account to verify and is not listed.
    const scan = await this.discoveryGate.collectVisible({
      fetchChunk: (offset, size) =>
        this.repo.find({
          where: { status: "active" },
          select: ["id", "sourceId"],
          order: { updatedAt: "DESC", id: "ASC" },
          skip: offset,
          take: size,
        }),
      userIdOf: (p) => p.sourceId,
      wanted: Number.POSITIVE_INFINITY,
      chunkSize: 500,
    });

    const total = scan.length;
    const start = Math.max(0, (page - 1) * take);
    const pageIds = scan.slice(start, start + take).map((p) => p.id);
    if (pageIds.length === 0) return { data: [], total, page, limit: take };

    const rows = await this.repo.find({
      where: { id: In(pageIds) },
      select: TalentProfileController.PUBLIC_FIELDS,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const profiles = pageIds
      .map((id) => byId.get(id))
      .filter((p): p is TalentProfile => Boolean(p));
    return { data: profiles, total, page, limit: take };
  }
}

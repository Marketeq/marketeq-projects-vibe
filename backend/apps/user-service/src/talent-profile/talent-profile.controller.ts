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
import { Repository } from "typeorm";
import { TalentProfile } from "./entities/talent-profile.entity";
import { Public } from "../decorators/public.decorator";
import { RecommendTalentDto } from "./dto/recommend-talent.dto";
import { TalentProfileRecommendationService } from "./talent-profile-recommendation.service";
import { TalentGateStateService, openTalentTextSql } from "../identity-gate/talent-gate-state.service";

@Controller("public/talent")
export class TalentProfileController {
  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
    private readonly recommendationService: TalentProfileRecommendationService,
    private readonly gateState: TalentGateStateService,
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

    // G1: the browse list contains only talent whose gate is open, and its total and pages count
    // only those. The gate is a semi-join inside the query (against the locally kept last-known
    // gate state), so it is applied before the count and before skip/take: the page is a slice of
    // the visible list, the total is exact, and only the visible page's columns are read - one
    // COUNT and one page query, however large the table, with no call to identity. sourceId is the
    // account id the gate is keyed on and is never part of the response. A profile with no
    // sourceId has no account to verify and is not listed; an account whose state was never
    // received is not listed. If the state table cannot be read, nobody is listed.
    const skip = Math.max(0, (page - 1) * take);
    try {
      const [profiles, total] = await this.repo
        .createQueryBuilder("p")
        .select(TalentProfileController.PUBLIC_FIELDS.map((f) => `p.${String(f)}`))
        .where("p.status = :status", { status: "active" })
        .andWhere(openTalentTextSql("p.sourceId"))
        .orderBy("p.updatedAt", "DESC")
        .addOrderBy("p.id", "ASC")
        .skip(skip)
        .take(take)
        .getManyAndCount();
      return { data: profiles, total, page, limit: take };
    } catch (err) {
      if (!this.gateState.isUnreadable(err)) throw err;
      this.gateState.warnUnreadable("the public talent list", err);
      return { data: [], total: 0, page, limit: take };
    }
  }
}

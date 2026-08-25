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

@Controller("public/talent")
export class TalentProfileController {
  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
    private readonly recommendationService: TalentProfileRecommendationService,
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
    const [profiles, total] = await this.repo.findAndCount({
      where: { status: "active" },
      select: TalentProfileController.PUBLIC_FIELDS,
      order: { updatedAt: "DESC" },
      skip: (page - 1) * take,
      take,
    });
    return { data: profiles, total, page, limit: take };
  }
}

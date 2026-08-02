import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TalentProfile } from "./entities/talent-profile.entity";
import { TalentProfileSyncService } from "./talent-profile-sync.service";
import { TalentProfileSyncConsumer } from "./talent-profile-sync.consumer";
import { TalentProfileController } from "./talent-profile.controller";
import { TalentProfileRecommendationService } from "./talent-profile-recommendation.service";
import { User } from "../user/entities/user.entity";

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([TalentProfile, User])],
  controllers: [TalentProfileController, TalentProfileSyncConsumer],
  providers: [TalentProfileSyncService, TalentProfileRecommendationService],
  exports: [TalentProfileSyncService, TalentProfileRecommendationService],
})
export class TalentProfileModule {}

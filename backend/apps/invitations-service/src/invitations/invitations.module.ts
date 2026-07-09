import { BrevoModule } from '../../../notification-service/src/brevo/brevo.service';
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { Invitation } from "../entities/invitation.entity";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { NotificationsClient } from "./notifications.client";
import { UserServiceClient } from "./user-service.client";
@Module({
  imports: [TypeOrmModule.forFeature([Invitation]), HttpModule, BrevoModule],
  // Mock notifications controller is temporarily disabled.
  controllers: [InvitationsController],
  providers: [InvitationsService, NotificationsClient, UserServiceClient],
  exports: []
})
export class InvitationsModule {}

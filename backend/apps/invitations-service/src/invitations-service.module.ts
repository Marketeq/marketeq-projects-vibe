import { Module } from '@nestjs/common';
import { UinvitationsUserviceController } from './invitations-service.controller';
import { UinvitationsUserviceService } from './invitations-service.service';

@Module({
  imports: [],
  controllers: [UinvitationsUserviceController],
  providers: [UinvitationsUserviceService],
})
export class UinvitationsUserviceModule {}

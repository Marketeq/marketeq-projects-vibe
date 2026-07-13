import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserProfileClient } from './user-profile.client';

@Module({
  imports: [HttpModule],
  providers: [UserProfileClient],
  exports: [UserProfileClient],
})
export class UserProfileModule {}

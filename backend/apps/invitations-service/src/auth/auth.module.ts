import { Module } from '@nestjs/common';
import { AuthModule as SharedAuthModule } from '@libs/auth';

@Module({
  imports: [SharedAuthModule],
  exports: [SharedAuthModule],
})
export class AuthModule {}

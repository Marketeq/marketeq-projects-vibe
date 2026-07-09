import { Module }                    from '@nestjs/common';
import { TypeOrmModule }             from '@nestjs/typeorm';
import { OAuthService }              from './oauth.service';
import { OAuthCallbackController, OAuthReauthorizeController } from './oauth.controller';
import { DepositMethod }             from '../entities/deposit-method.entity';
import { PublishersModule }          from '../publishers/publishers.module';

@Module({
  imports: [TypeOrmModule.forFeature([DepositMethod]), PublishersModule],
  controllers: [OAuthCallbackController, OAuthReauthorizeController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}

import { Module } from '@nestjs/common';
import { ParsingModule } from './parsing/parsing.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ParsingModule],
  controllers: [HealthController],
})
export class AppModule {}

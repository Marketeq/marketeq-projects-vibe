import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { uteamsController } from './team.controller';
import { uteamsService } from './team.service';
import { uteam } from './entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([uteam])],
  controllers: [uteamsController],
  providers: [uteamsService],
  exports: [uteamsService],
})
export class uteamsModule {}

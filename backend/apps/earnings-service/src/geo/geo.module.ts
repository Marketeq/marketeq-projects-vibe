import { Module }      from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeoService }  from './geo.service';

@Module({
  imports:  [ConfigModule],
  providers:[GeoService],
  exports:  [GeoService],
})
export class GeoModule {}

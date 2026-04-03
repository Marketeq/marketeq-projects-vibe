import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { AutocompleteController } from './autocomplete.controller';

@Module({
  imports: [GatewayHttpModule],
  controllers: [AutocompleteController],
})
export class AutocompleteModule {}

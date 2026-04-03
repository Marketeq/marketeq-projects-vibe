import { Controller, Post, Body, Req } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Controller('wire')
export class WireReviewController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  @Post('review/resolve')
  async resolve(@Body() body: any) {
    const baseUrl = this.configService.get<string>('WIRE_REVIEW_SERVICE_URL');
    const url = `${baseUrl}/admin/wire-review/resolve`;
    const response = await firstValueFrom(this.httpService.post(url, body));
    return response.data;
  }

  @Post('webhook/quickbooks')
  async handleQuickBooksWebhook(@Req() req: any) {
    const baseUrl = this.configService.get<string>('WIRE_REVIEW_SERVICE_URL');
    const url = `${baseUrl}/webhook/quickbooks`;
    const response = await firstValueFrom(this.httpService.post(url, req.body));
    return response.data;
  }
}

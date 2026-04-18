import { Controller, Get, Post, Body, Req, Query, Param, UseGuards } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { StorePublicKeyDto } from './dtos/store-public-key.dto';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';

@UseGuards(GatewayAuthGuard)
@Controller('messaging')
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post('public-key')
  async storePublicKey(@Req() req: any, @Body() dto: StorePublicKeyDto) {
    const userId = req.user.id;
    await this.encryptionService.storePublicKey(userId, dto.publicKey);
    return { success: true };
  }

  @Get('get-public-key')
  async getPublicKey(@Req() req: any, @Query('userId') userId?: string) {
    const targetUserId = userId || req.user.id;
    const publicKey = await this.encryptionService.getPublicKey(targetUserId);
    return { publicKey };
  }

  @Get('conversations/:convId/key')
  async getConversationKey(
    @Req() req: any,
    @Param('convId') convId: string,
    @Query('isGroup') isGroup?: string,
  ) {
    const userId = req.user.id;
    const isGroupBool = isGroup === 'true';
    const encryptedKey = await this.encryptionService.getConversationKey(convId, userId, isGroupBool);
    return { encryptedKey };
  }
}

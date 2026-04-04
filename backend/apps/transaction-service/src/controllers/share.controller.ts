import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShareService } from '../services/share.service';

@Controller('share')
@UseGuards(AuthGuard('jwt'))
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get('transaction/:id')
  getTransactionContext(@Param('id') id: string, @Req() req: any) {
    return this.shareService.getTransactionContext(id, req.user.userId);
  }

  @Get('invoice/:id')
  getInvoiceContext(@Param('id') id: string, @Req() req: any) {
    return this.shareService.getInvoiceContext(id, req.user.userId);
  }
}
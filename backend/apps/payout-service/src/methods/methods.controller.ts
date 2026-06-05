import { Controller, Get, Post, Patch, Delete, Body, Param, Query,
         UseGuards, Request, HttpCode, ParseUUIDPipe, 
         ForbiddenException} from '@nestjs/common';
import { MethodsService }   from './methods.service';
import { JwtAuthGuard }     from '../guards/jwt-auth.guard';
import { AddMethodDto }     from './dto/add-method.dto';
import { UpdateMethodDto }  from './dto/update-method.dto';
import { StripeProvider }   from '../providers/stripe.provider';
import { MicroDepositService } from './micro-deposit.service';

@Controller('v1/deposit-methods')
@UseGuards(JwtAuthGuard)
export class MethodsController {
  constructor(
    private readonly methodsService: MethodsService,
    private readonly stripeProvider: StripeProvider,
    private readonly microDepositSvc: MicroDepositService,
  ) {}

  @Get()
  @HttpCode(200)
  async list(@Request() req: any) {
    return this.methodsService.listMethods(req.user.userId);
  }

  @Post()
  @HttpCode(201)
  async add(@Request() req: any, @Body() dto: AddMethodDto) {
    return this.methodsService.addMethod(req.user.userId, dto);
  }

  @Get(':id')
  @HttpCode(200)
  async getOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.methodsService.getMethod(req.user.userId, id);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMethodDto) {
    return this.methodsService.updateMethod(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async deactivate(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.methodsService.deactivate(req.user.userId, id);
  }

  @Post(':id/set-default')
  @HttpCode(200)
  async setDefault(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.methodsService.setDefault(req.user.userId, id);
  }

  @Get(':id/verification-status')
  @HttpCode(200)
  async verificationStatus(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.methodsService.getVerificationStatus(req.user.userId, id);
  }

  // ─── Stripe FC specific routes ────────────────────────────────

  @Post('stripe/finalise')
  @HttpCode(200)
  async stripeFinalize(@Request() req: any, @Body() body: { sessionId: string; linkedAccountId: string }) {
    return this.stripeProvider.finaliseBankStripe(req.user.userId, body.sessionId, body.linkedAccountId);
  }

  @Post('stripe/restart')
  @HttpCode(200)
  async stripeRestart(@Request() req: any, @Body() body: { oldMethodId?: string }) {
    return this.stripeProvider.restartStripeFC(req.user.userId, body.oldMethodId);
  }

  @Get(':id/verification-amounts')
  @HttpCode(200)
  async verificationAmounts(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('This endpoint is disabled in production');
    }
    return this.microDepositSvc.getVerificationAmounts(req.user.userId, id);
  }

  @Post(':id/verify-micro-deposits')
  @HttpCode(200)
  async verifyMicroDeposits(
    @Request() req: any, @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { amount1Cents: number; amount2Cents: number },
  ) {
    return this.microDepositSvc.confirmMicroDeposits(req.user.userId, id, body);
  }
}

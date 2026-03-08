import { Controller, Post, Put, Get, Param, Body } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContractsService } from '../services/contracts.service';

@Controller('v1')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Post('contract-groups')
  createGroup(@Body() dto: any) {
    return this.service.createGroup(dto);
  }

  @Get('contract-groups/:id')
  getGroup(@Param('id') id: string) {
    return this.service.getGroup(id);
  }

  @Get('contracts/:id')
  getContract(@Param('id') id: string) {
    return this.service.getContract(id);
  }

  @Get('contracts/client/:clientId')
  getClientContracts(@Param('clientId') clientId: string) {
    return this.service.getContractsByClient(clientId);
  }

  @Get('contracts/talent/:talentId')
  getTalentContracts(@Param('talentId') talentId: string) {
    return this.service.getContractsByTalent(talentId);
  }

  @Put('contracts/:id/respond')
  respond(@Param('id') id: string, @Body() dto: { accepted: boolean; talentId: string }) {
    return this.service.respondToOffer(id, dto);
  }

  @Put('contracts/:id/end')
  endContract(@Param('id') id: string, @Body() dto: { reasonCode: string; notes: string }) {
    return this.service.endContract(id, dto);
  }

  @Post('webhooks/checkout/deposit-cleared')
  depositCleared(@Body() payload: { groupId: string }) {
    return this.service.activateGroup(payload.groupId);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'contracts-service' };
  }

  @MessagePattern('contract.activate')
  handleActivate(@Payload() data: { groupId: string }) {
    return this.service.activateGroup(data.groupId);
  }
}

import { Controller, Get, Put, Param, Body, Request, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContractsService } from '../services/contracts.service';
import { EndContractDto } from '../dtos/end-contract.dto';
import { AcceptRejectDto } from '../dtos/accept-reject.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get(':id')
  getContract(@Param('id') id: string) {
    return this.svc.getContract(id);
  }

  @Get('client/:clientId')
  getClientContracts(@Param('clientId') clientId: string) {
    return this.svc.getContractsByClient(clientId);
  }

  @Get('talent/:talentId')
  getTalentContracts(@Param('talentId') talentId: string) {
    return this.svc.getContractsByTalent(talentId);
  }

  @UseGuards(RolesGuard('client'))
  @Put(':id/end')
  endContract(@Param('id') id: string, @Body() dto: EndContractDto, @Request() req: any) {
    return this.svc.endContract(id, dto, req.user);
  }

  @UseGuards(RolesGuard('talent'))
  @Put(':id/respond')
  respond(@Param('id') id: string, @Body() dto: AcceptRejectDto, @Request() req: any) {
    return this.svc.respondToOffer(id, dto, req.user);
  }

  @MessagePattern('contract.activate')
  handleActivate(@Payload() data: { groupId: string; paymentRef?: string }) {
    return this.svc.activateGroup(data.groupId, data.paymentRef);
  }
}

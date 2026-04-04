import { Controller, Post, Put, Get, Param, Body } from '@nestjs/common';
import { ContractsService } from '../services/contracts.service';
import { EndContractDto } from '../dtos/end-contract.dto';
import { AcceptRejectDto } from '../dtos/accept-reject.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // End a single contract
  @Put(':id/end')
  async endContract(@Param('id') id: string, @Body() dto: EndContractDto) {
    return this.contractsService.endContract(id, dto);
  }

  // Accept/Reject flow for talent
  @Put(':id/respond')
  async respond(@Param('id') id: string, @Body() dto: AcceptRejectDto) {
    return this.contractsService.respondToOffer(id, dto);
  }

  // List contracts for a client
  @Get('client/:clientId')
  async getClientContracts(@Param('clientId') clientId: string) {
    return this.contractsService.getContractsByClient(clientId);
  }

  // List contracts for a talent
  @Get('talent/:talentId')
  async getTalentContracts(@Param('talentId') talentId: string) {
    return this.contractsService.getContractsByTalent(talentId);
  }

  // Get one contract by ID
  @Get(':id')
  async getContract(@Param('id') id: string) {
    return this.contractsService.getContract(id);
  }
}

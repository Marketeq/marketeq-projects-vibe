import { Controller, Post, Get, Param, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { ContractGroup } from '../entities/contract-group.entity';
import { Contract } from '../entities/contract.entity';
import { ContractGroupSummaryDto } from '../dtos/contract-group-summary.dto';

@Controller('contract-groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // Create a new group with N contracts
  @Post()
  async createGroup(
    @Body() dto: CreateGroupDto,
  ): Promise<{ group: ContractGroup; contracts: Contract[] }> {
    return this.groupsService.createGroup(dto);
  }

  // FR-1: the authenticated client's own contract groups, for the Hire Me
  // modal's "existing contracts" list. Identity from req.user only, never
  // a path param. Declared ahead of GET :id below — both are GET, so
  // Nest/Express would otherwise match "mine" against :id first.
  @Get('mine')
  async getMyGroups(
    @Req() req: Request & { user: { sub: string } },
  ): Promise<ContractGroupSummaryDto[]> {
    return this.groupsService.getGroupsForClient(req.user.sub);
  }

  // Get one group and all contracts
  @Get(':id')
  async getGroup(@Param('id') id: string) {
    return this.groupsService.getGroup(id);
  }
}

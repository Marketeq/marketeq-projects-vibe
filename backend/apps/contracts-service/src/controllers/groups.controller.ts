import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { ContractGroup } from '../entities/contract-group.entity';
import { Contract } from '../entities/contract.entity';

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

  // Get one group and all contracts
  @Get(':id')
  async getGroup(@Param('id') id: string) {
    return this.groupsService.getGroup(id);
  }
}

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { ContractGroup } from '../entities/contract-group.entity';
import { Contract } from '../entities/contract.entity';

@Controller('contract-groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // Create a new group with N contracts. ownerClientId comes from req.user
  // only — it used to be a client-supplied DTO field, which let any
  // authenticated caller forge a group (and every child Contract's
  // clientId) under someone else's identity. Removed from CreateGroupDto
  // entirely rather than ignored/validated, so a caller still sending it
  // gets a clean 400 from the global ValidationPipe's forbidNonWhitelisted,
  // not silent stripping.
  @Post()
  async createGroup(
    @Body() dto: CreateGroupDto,
    @Req() req: Request & { user: { sub: string } },
  ): Promise<{ group: ContractGroup; contracts: Contract[] }> {
    return this.groupsService.createGroup(dto, req.user.sub);
  }

  // Get one group and all contracts. Same class of IDOR as the fixed
  // GET /contracts/client/:clientId: the global guard only proves the
  // caller is authenticated, not that they own this group. Ordering is
  // deliberate: groupsService.getGroup already throws NotFoundException
  // when the id doesn't exist, so that 404 always resolves before this
  // ownership check ever runs — missing → 404, exists but not yours → 403,
  // never a 500 from comparing ownerClientId on a null group.
  @Get(':id')
  async getGroup(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const group = await this.groupsService.getGroup(id);
    if (group.ownerClientId !== req.user.sub) {
      throw new ForbiddenException('You may only view your own group');
    }
    return group;
  }
}

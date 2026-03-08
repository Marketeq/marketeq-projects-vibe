import { Controller, Post, Get, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ContractsService } from '../services/contracts.service';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('contract-groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly svc: ContractsService) {}

  @UseGuards(RolesGuard('client'))
  @Post()
  createGroup(@Body() dto: CreateGroupDto, @Request() req: any) {
    return this.svc.createGroup(dto, req.user);
  }

  @Get(':id')
  getGroup(@Param('id') id: string) {
    return this.svc.getGroup(id);
  }
}

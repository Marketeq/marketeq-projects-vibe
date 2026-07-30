import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { AblyService } from '../ably/ably.service';
import { BlockEnforcementService } from '../blocks/block-enforcement.service';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { AddParticipantDto } from './dtos/add-participant.dto';
import {
  AssignListsDto,
  BulkStateDto,
  CreateListDto,
  UpdateListDto,
} from './dtos/thread-list.dto';

@UseGuards(GatewayAuthGuard)
@Controller('v1/threads')
export class ThreadsController {
  constructor(
    private readonly threadsService: ThreadsService,
    private readonly ablyService: AblyService,
    private readonly blockEnforcement: BlockEnforcementService,
  ) {}

  // --- Static routes (must come before /:id) ---

  @Get()
  getUserThreads(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.threadsService.getUserThreads(req.user?.id, projectId);
  }

  @Get('ably-token')
  async getAblyToken(@Req() req: any, @Query('threadId') threadId?: string) {
    const userId = req.user?.id;
    if (threadId) {
      const thread = await this.threadsService.assertUserIsParticipant(threadId, userId);
      const allowed = await this.blockEnforcement.getCapabilityThreadIds(userId, [thread]);
      return this.ablyService.createTokenRequest(userId, allowed);
    }
    return this.ablyService.createTokenRequest(userId);
  }

  @Post()
  create(
    @Body() body: { participantIds: string[]; isGroup?: boolean; groupName?: string },
    @Req() req: any,
  ) {
    return this.threadsService.create(body.participantIds, body.isGroup, body.groupName, req.user?.id);
  }

  @Post('project')
  openProjectThread(
    @Body() body: { projectId: string; teamMemberIds: string[] },
    @Req() req: any,
  ) {
    return this.threadsService.getOrCreateProjectThread(
      body.projectId,
      body.teamMemberIds ?? [],
      req.user?.id,
    );
  }

  // Custom lists

  @Get('lists')
  getLists(@Req() req: any) {
    return this.threadsService.getLists(req.user?.id);
  }

  @Post('lists')
  createList(@Req() req: any, @Body() dto: CreateListDto) {
    return this.threadsService.createList(req.user?.id, dto.name);
  }

  @Patch('lists/:listId')
  renameList(
    @Req() req: any,
    @Param('listId') listId: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.threadsService.renameList(req.user?.id, listId, dto.name);
  }

  @Delete('lists/:listId')
  deleteList(@Req() req: any, @Param('listId') listId: string) {
    return this.threadsService.deleteList(req.user?.id, listId);
  }

  // Bulk

  @Patch('bulk')
  bulk(@Req() req: any, @Body() dto: BulkStateDto) {
    return this.threadsService.bulkAction(req.user?.id, dto.ids, dto.action);
  }

  // --- Per-thread routes ---

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.findOne(id, req.user?.id);
  }

  @Post(':id/participants')
  addParticipant(
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
    @Req() req: any,
  ) {
    return this.threadsService.addParticipant(id, req.user?.id, dto.userId, dto.encryptedGroupKey);
  }

  @Delete(':id/participants/:userId')
  removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.threadsService.removeParticipant(id, req.user?.id, userId);
  }

  // State toggles — per-action endpoints per AC

  @Post(':id/star')
  star(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isStarred', true);
  }

  @Delete(':id/star')
  unstar(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isStarred', false);
  }

  @Post(':id/pin')
  pin(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isPinned', true);
  }

  @Delete(':id/pin')
  unpin(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isPinned', false);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isArchived', true);
  }

  @Delete(':id/archive')
  unarchive(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isArchived', false);
  }

  @Post(':id/spam')
  spam(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isSpam', true);
  }

  @Delete(':id/spam')
  unspam(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isSpam', false);
  }

  @Post(':id/mute')
  mute(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isMuted', true);
  }

  @Delete(':id/mute')
  unmute(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isMuted', false);
  }

  @Post(':id/trash')
  trash(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isTrashed', true);
  }

  @Delete(':id/trash')
  untrash(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.setFlag(id, req.user?.id, 'isTrashed', false);
  }

  @Post(':id/mark-unread')
  markUnread(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.markUnread(id, req.user?.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.threadsService.markRead(id, req.user?.id);
  }

  @Patch(':id/lists')
  assignLists(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: AssignListsDto,
  ) {
    return this.threadsService.assignThreadToLists(id, req.user?.id, dto.listIds);
  }
}

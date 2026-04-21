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
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { JobListingOwnerGuard } from '../guards/job-listing-owner.guard';
import { JobListingService } from '../services/job-listing.service';
import { JobListingPublishService } from '../services/job-listing-publish.service';
import { CreateJobListingDto } from '../dto/create-job-listing.dto';
import { UpdateJobListingDto } from '../dto/update-job-listing.dto';
import { UpdateBasicInformationDto } from '../dto/update-basic-info.dto';
import { SendInvitesDto } from '../dto/send-invites.dto';
import { PresignBriefUploadDto } from '../dto/presign-brief-upload.dto';
import { ListJobListingsQueryDto } from '../dto/list-job-listings-query.dto';
import { CreateRoleRowDto } from '../dto/create-role-row.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/job-listings')
export class JobListingController {
  constructor(
    private readonly jobListingService: JobListingService,
    private readonly publishService: JobListingPublishService,
  ) {}

  // ── POST /v1/job-listings ────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() dto: CreateJobListingDto) {
    return this.jobListingService.create(req.user.sub, dto);
  }

  // ── GET /v1/job-listings ─────────────────────────────────────
  @Get()
  findAll(@Req() req: any, @Query() query: ListJobListingsQueryDto) {
    return this.jobListingService.findAll(req.user.sub, query);
  }

  // ── GET /v1/job-listings/:id ─────────────────────────────────
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.jobListingService.findOne(req.user.sub, id);
  }

  // ── PATCH /v1/job-listings/:id ───────────────────────────────
  @Patch(':id')
  @UseGuards(JobListingOwnerGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateJobListingDto) {
    return this.jobListingService.update(req.user.sub, id, dto);
  }

  // ── PATCH /v1/job-listings/:id/basic-information ─────────────
  @Patch(':id/basic-information')
  @UseGuards(JobListingOwnerGuard)
  updateBasicInformation(@Param('id') id: string, @Body() dto: UpdateBasicInformationDto) {
    return this.jobListingService.updateBasicInformation(id, dto);
  }

  // ── POST /v1/job-listings/:id/publish ────────────────────────
  @Post(':id/publish')
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  publish(@Req() req: any, @Param('id') id: string) {
    return this.publishService.publish(req.user.sub, id);
  }

  // ── POST /v1/job-listings/:id/revert-to-draft ────────────────
  @Post(':id/revert-to-draft')
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  revertToDraft(@Req() req: any, @Param('id') id: string) {
    return this.publishService.revertToDraft(req.user.sub, id);
  }

  // ── DELETE /v1/job-listings/:id ──────────────────────────────
  @Delete(':id')
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.jobListingService.softDelete(id);
  }

  // ── POST /v1/job-listings/:id/duplicate-role ─────────────────
  @Post(':id/duplicate-role')
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.CREATED)
  duplicateRole(
    @Param('id') id: string,
    @Body('roleRowId') roleRowId: string,
  ) {
    return this.jobListingService.duplicateRole(id, roleRowId);
  }

  // ── POST /v1/job-listings/:id/invite ─────────────────────────
  @Post(':id/invite')
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  sendInvites(
    @Param('id') id: string,
    @Body() dto: SendInvitesDto,
  ) {
    return this.jobListingService.sendInvites(id, dto);
  }

  // ── POST /v1/job-listings/:id/brief-upload/presign ───────────
  @Post(':id/brief-upload/presign')
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.OK)
  presignBriefUpload(
    @Param('id') id: string,
    @Body() dto: PresignBriefUploadDto,
  ) {
    return this.jobListingService.presignBriefUpload(id, dto);
  }

  // ── POST /v1/job-listings/:id/roles ──────────────────────────
  @Post(':id/roles')
  @UseGuards(JobListingOwnerGuard)
  @HttpCode(HttpStatus.CREATED)
  createRoleRow(
    @Param('id') id: string,
    @Body() dto: CreateRoleRowDto,
  ) {
    return this.jobListingService.createRoleRow(id, dto);
  }
}

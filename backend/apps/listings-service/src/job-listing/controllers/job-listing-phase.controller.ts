import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { JobListingOwnerGuard } from '../guards/job-listing-owner.guard';
import { JobListingPhaseService } from '../services/job-listing-phase.service';
import { CreatePhaseDto } from '../dto/create-phase.dto';
import { UpdatePhaseDto } from '../dto/update-phase.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ReorderPhasesDto } from '../dto/reorder-phases.dto';

@UseGuards(JwtAuthGuard, JobListingOwnerGuard)
@Controller('v1/job-listings/:id/phases')
export class JobListingPhaseController {
  constructor(private readonly phaseService: JobListingPhaseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addPhase(@Param('id') listingId: string, @Body() dto: CreatePhaseDto) {
    return this.phaseService.addPhase(listingId, dto);
  }

  @Patch('reorder')
  reorderPhases(
    @Param('id') listingId: string,
    @Body() dto: ReorderPhasesDto,
  ) {
    return this.phaseService.reorderPhases(listingId, dto);
  }

  @Patch(':phaseId')
  updatePhase(
    @Param('id') listingId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseDto,
  ) {
    return this.phaseService.updatePhase(listingId, phaseId, dto);
  }

  @Delete(':phaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhase(
    @Param('id') listingId: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.phaseService.removePhase(listingId, phaseId);
  }

  @Post(':phaseId/tasks')
  @HttpCode(HttpStatus.CREATED)
  addTask(
    @Param('id') listingId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.phaseService.addTask(listingId, phaseId, dto);
  }

  @Patch(':phaseId/tasks/:taskId')
  updateTask(
    @Param('id') listingId: string,
    @Param('phaseId') phaseId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.phaseService.updateTask(listingId, phaseId, taskId, dto);
  }

  @Delete(':phaseId/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTask(
    @Param('id') listingId: string,
    @Param('phaseId') phaseId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.phaseService.removeTask(listingId, phaseId, taskId);
  }
}

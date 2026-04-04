import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobListing } from '../entities/job-listing.entity';

// Ensures the authenticated user is the client who created the listing.
// Applied to all PATCH, POST sub-resource, and DELETE endpoints.
// GET endpoints are protected by JwtAuthGuard only.
@Injectable()
export class JobListingOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(JobListing)
    private readonly repo: Repository<JobListing>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const id = request.params?.id;

    if (!id) return true; // No listing ID in route — guard not applicable.

    const listing = await this.repo.findOne({
      where: { id },
      select: ['id', 'clientUserId'],
    });

    if (!listing)
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Job listing not found.' });

    if (listing.clientUserId !== userId)
      throw new ForbiddenException({
        code: 'JL_FORBIDDEN',
        message: 'You do not have permission to modify this listing.',
      });

    return true;
  }
}

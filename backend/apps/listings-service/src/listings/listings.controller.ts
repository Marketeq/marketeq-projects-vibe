import { Controller, Get, Post, Body, Param, Headers, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { ConfigService } from '@nestjs/config';

@Controller('internal/listings')
export class ListingsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly configService: ConfigService,
  ) {}

  private validateInternalToken(token: string | undefined) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }
  }

  // health/dashboard
  @Get('/dashboard')
  getProfile() {
    return { name: 'Ali', email: 'ali@example.com' };
  }

  // List projects
  @Get()
  async findAll() {
    return this.projects.findAll();
  }

  @Post(':id/cms-sync')
  async syncFromCms(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    this.validateInternalToken(token);
    
    // For now, we only support projects as the primary sync target for Listings collection
    // unless we inject more services.
    const { listingType, ...payload } = dto;
    
    if (listingType === 'project') {
       // Only sync fields that exist in the listings-service Project entity
       // and are considered 'editorial' or needed for sync consistency.
       const projectPayload: any = {};
       if (dto.title) projectPayload.title = dto.title;
       if (dto.excerpt) projectPayload.shortDescription = dto.excerpt;
       if (typeof dto.featured === 'boolean') projectPayload.featured = dto.featured;
       if (typeof dto.rating === 'number') projectPayload.rating = dto.rating;
       if (typeof dto.reviewCount === 'number') projectPayload.reviewCount = dto.reviewCount;
       if (dto.status) {
         // Map status if needed. ListingStatus enum in backend: draft, published, etc.
         projectPayload.status = dto.status; 
       }
       
       return this.projects.update(id, projectPayload, 'cms-sync');
    }
    
    // TODO: support other types (service, team, job)
    return { success: true, message: `Received sync for ${listingType} but only projects are fully wired for outbound sync currently.` };
  }
}
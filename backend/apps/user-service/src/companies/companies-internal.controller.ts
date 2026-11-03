import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { CompaniesService } from './companies.service';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';

@ApiTags('companies-internal')
@Public()
@Controller('internal/companies')
export class CompaniesInternalController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly configService: ConfigService,
  ) {}

  private assertInternalToken(token: string | undefined) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }
  }

  @ApiOperation({ summary: 'Look up a company member by email (internal services)' })
  @Get('member-by-email')
  @HttpCode(HttpStatus.OK)
  async getMemberByEmail(
    @Headers('x-internal-token') token: string | undefined,
    @Query('companyId') companyId: string,
    @Query('email') email: string,
  ) {
    this.assertInternalToken(token);
    const member = await this.companies.getMemberByEmail(companyId, email);
    return { success: true, data: member };
  }

  @ApiOperation({ summary: 'Get a company by id (internal services)' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.assertInternalToken(token);
    const data = await this.companies.findOne(id);
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Add/update a company member (internal services)' })
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: AddCompanyMemberDto,
  ) {
    this.assertInternalToken(token);
    const data = await this.companies.addMemberInternal(id, dto);
    return { success: true, data, message: 'Company member added successfully' };
  }

  @ApiOperation({ summary: 'Count members of a company (internal services)' })
  @Get(':id/member-count')
  @HttpCode(HttpStatus.OK)
  async getMemberCount(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.assertInternalToken(token);
    const count = await this.companies.countMembers(id);
    return { success: true, count };
  }

  @ApiOperation({ summary: 'Check whether a userId is a company member (internal services)' })
  @Get(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async getMember(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    this.assertInternalToken(token);
    // `isMember` is what this route has always returned and stays first for
    // the callers that only check that. `member` is additive: invitations-
    // service needs the permission roles behind the membership to apply the
    // R3-12 row-action table, and had no way to read them by user id.
    const member = await this.companies.getMembership(id, userId);
    return {
      success: true,
      isMember: !!member,
      member: member
        ? {
            companyId: member.companyId,
            userId: member.userId,
            role: member.role,
            permissions: member.permissions ?? [],
          }
        : null,
    };
  }
}

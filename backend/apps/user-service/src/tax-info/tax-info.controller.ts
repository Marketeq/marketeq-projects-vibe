import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { UserService } from '../user/user.service';
import { TaxInfoService } from './tax-info.service';
import { UpsertTaxInfoDto } from './tax-info.dto';
import { TaxDocumentService } from './tax-document.service';

@ApiTags('User')
@Controller('user/tax-info')
export class TaxInfoController {
  constructor(
    private readonly taxInfo: TaxInfoService,
    private readonly userService: UserService,
    private readonly documents: TaxDocumentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Read the signed-in user tax information' })
  async get(@CurrentUser() user: JwtUser) {
    const resolved = await this.userService.getUserByClaims(user);
    return this.taxInfo.get(resolved.id);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update the signed-in user tax information' })
  async upsert(@CurrentUser() user: JwtUser, @Body() dto: UpsertTaxInfoDto) {
    const resolved = await this.userService.getUserByClaims(user);
    return this.taxInfo.upsert(resolved.id, dto);
  }

  @Get('documents/certification')
  @ApiOperation({ summary: 'Download the substitute W-9 / W-8BEN as a PDF' })
  async certification(@CurrentUser() user: JwtUser, @Res() res: Response) {
    const resolved = await this.userService.getUserByClaims(user);
    const { entity, tinLast4 } = await this.taxInfo.forDocument(resolved.id);
    if (!entity?.submittedAt) {
      throw new NotFoundException('No certified form to download yet');
    }
    const kind = entity.country === 'United States' ? 'w9' : 'w8ben';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="marketeq-${kind}.pdf"`,
    );
    this.documents.certification(entity, tinLast4).pipe(res);
  }

  @Get('documents/1099-nec/:taxYear')
  @ApiOperation({ summary: 'Download a 1099-NEC as a PDF' })
  async form1099(
    @CurrentUser() user: JwtUser,
    @Param('taxYear', ParseIntPipe) taxYear: number,
    @Res() res: Response,
  ) {
    const resolved = await this.userService.getUserByClaims(user);
    const { entity, tinLast4 } = await this.taxInfo.forDocument(resolved.id);
    if (!entity?.submittedAt) {
      throw new NotFoundException('Submit your tax information first');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="marketeq-1099-nec-${taxYear}.pdf"`,
    );
    this.documents.form1099(entity, taxYear, tinLast4).pipe(res);
  }

  @Post('submit')
  @ApiOperation({
    summary: 'Certify the W-9. Produces the downloadable documents.',
  })
  async submit(@CurrentUser() user: JwtUser) {
    const resolved = await this.userService.getUserByClaims(user);
    return this.taxInfo.submit(resolved.id);
  }
}

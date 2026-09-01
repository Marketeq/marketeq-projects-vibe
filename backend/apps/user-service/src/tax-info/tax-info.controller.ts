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
    const { entity, tin, tinLast4 } = await this.taxInfo.forDocument(resolved.id);
    if (!entity?.submittedAt) {
      throw new NotFoundException('No certified form to download yet');
    }

    // Filers outside the US certify on a W-8BEN, which is not yet filled from
    // the official form, so they keep the substitute rendering.
    if (entity.country !== 'USA' && entity.country !== 'United States') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="marketeq-w8ben.pdf"',
      );
      this.documents.certification(entity, tinLast4).pipe(res);
      return;
    }

    const pdf = await this.documents.officialW9(entity, tin ?? '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="form-w9.pdf"');
    res.send(pdf);
  }

  @Get('documents/1099-k/:taxYear')
  @ApiOperation({ summary: 'Download a 1099-K as a PDF' })
  async form1099K(
    @CurrentUser() user: JwtUser,
    @Param('taxYear', ParseIntPipe) taxYear: number,
    @Res() res: Response,
  ) {
    const resolved = await this.userService.getUserByClaims(user);
    const { entity, tin } = await this.taxInfo.forDocument(resolved.id);
    if (!entity?.submittedAt) {
      throw new NotFoundException('Submit your tax information first');
    }
    // A 1099 is only furnished once every box on it can be filled. Serving a
    // partly filled copy would put an incomplete tax document in the
    // contractor's hands.
    if (!this.taxInfo.canIssue1099(entity, taxYear)) {
      throw new NotFoundException(
        `No 1099-K has been issued for ${taxYear} yet`,
      );
    }
    const pdf = await this.documents.official1099K(
      entity,
      tin ?? '',
      taxYear,
      this.taxInfo.reportFor(entity, taxYear)!,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="form-1099-k-${taxYear}.pdf"`,
    );
    res.send(pdf);
  }

  @Get('documents/certification/preview')
  @ApiOperation({ summary: 'PNG preview of the filled W-9' })
  async certificationPreview(
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
  ) {
    const resolved = await this.userService.getUserByClaims(user);
    const { entity, tin } = await this.taxInfo.forDocument(resolved.id);
    if (!entity?.submittedAt) {
      throw new NotFoundException('No certified form to preview yet');
    }
    const png = await this.documents.thumbnail(
      await this.documents.officialW9(entity, tin ?? ''),
    );
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(png);
  }

  @Get('documents/1099-k/:taxYear/preview')
  @ApiOperation({ summary: 'PNG preview of the filled 1099-K' })
  async form1099KPreview(
    @CurrentUser() user: JwtUser,
    @Param('taxYear', ParseIntPipe) taxYear: number,
    @Res() res: Response,
  ) {
    const resolved = await this.userService.getUserByClaims(user);
    const { entity, tin } = await this.taxInfo.forDocument(resolved.id);
    if (!entity?.submittedAt) {
      throw new NotFoundException('Submit your tax information first');
    }
    // A 1099 is only furnished once every box on it can be filled. Serving a
    // partly filled copy would put an incomplete tax document in the
    // contractor's hands.
    if (!this.taxInfo.canIssue1099(entity, taxYear)) {
      throw new NotFoundException(
        `No 1099-K has been issued for ${taxYear} yet`,
      );
    }
    const png = await this.documents.thumbnail(
      await this.documents.official1099K(
        entity,
        tin ?? '',
        taxYear,
        this.taxInfo.reportFor(entity, taxYear)!,
      ),
    );
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(png);
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

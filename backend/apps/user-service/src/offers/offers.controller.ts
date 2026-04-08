import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CreateOfferDto } from './dtos/create-offer.dto';
import { UpdateOfferDto } from './dtos/update-offer.dto';
import { GetOfferResponseDto } from './dtos/get-offer-response.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';

@Controller('talent')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @ApiOperation({ summary: 'Get all offers for a talent' })
  @ApiOkResponse({ type: [GetOfferResponseDto] })
  @Get('/:talentId/offers')
  getAll(@Param('talentId') talentId: string) {
    return this.offersService.getAllOffersForTalent(talentId);
  }

  @ApiOperation({ summary: 'Create offer for the current user' })
  @Post('/:talentId/offers')
  create(
    @CurrentUser() user: JwtUser,
    @Param('talentId') talentId: string,
    @Body() dto: CreateOfferDto,
  ) {
    if (talentId !== user.sub) {
      throw new ForbiddenException('You may only create offers for yourself');
    }
    return this.offersService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Update offer for the current user' })
  @Put('/:talentId/offers/:offerId')
  update(
    @CurrentUser() user: JwtUser,
    @Param('talentId') talentId: string,
    @Param('offerId') offerId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    if (talentId !== user.sub) {
      throw new ForbiddenException('You may only edit your own offers');
    }
    return this.offersService.update(user.sub, offerId, dto);
  }

  @ApiOperation({ summary: 'Delete offer for the current user' })
  @Delete('/:talentId/offers/:offerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtUser,
    @Param('talentId') talentId: string,
    @Param('offerId') offerId: string,
  ) {
    if (talentId !== user.sub) {
      throw new ForbiddenException('You may only delete your own offers');
    }
    return this.offersService.remove(user.sub, offerId);
  }
}

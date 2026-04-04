import {
  Body,
  Controller,
  Delete,
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
  create(@Param('talentId') talentId: string, @Body() dto: CreateOfferDto) {
    return this.offersService.create(talentId, dto);
  }

  @ApiOperation({ summary: 'Update offer for the current user' })
  @Put('/:talentId/offers/:offerId')
  update(
    @Param('talentId') talentId: string,
    @Param('offerId') offerId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(talentId, offerId, dto);
  }

  @ApiOperation({ summary: 'Delete offer for the current user' })
  @Delete('/:talentId/offers/:offerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('talentId') talentId: string,
    @Param('offerId') offerId: string,
  ) {
    return this.offersService.remove(talentId, offerId);
  }
}

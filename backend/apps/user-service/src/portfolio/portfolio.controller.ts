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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @ApiOperation({ summary: 'Create portfolio for the current user' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePortfolioDto) {
    return this.portfolioService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Get all portfolios for the current user' })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.portfolioService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Update portfolio for the current user' })
  @Put(':itemId')
  @HttpCode(HttpStatus.OK)
  update(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    const user = req.user as JwtUser;
    return this.portfolioService.update(user.sub, itemId, dto);
  }

  @ApiOperation({ summary: 'Delete portfolio for the current user' })
  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request, @Param('itemId') itemId: string) {
    const user = req.user as JwtUser;
    return this.portfolioService.remove(user.sub, itemId);
  }
}

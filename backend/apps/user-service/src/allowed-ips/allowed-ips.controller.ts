import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowedIpsService } from './allowed-ips.service';
import {
  BulkCreateAllowedIpsDto,
  CreateAllowedIpDto,
  UpdateAllowedIpDto,
} from './dto/create-allowed-ip.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { resolveCallerIp } from './caller-ip.util';
import { SetIpRestrictionDto } from './dto/create-allowed-ip.dto';

/**
 * Settings > IP Restrictions.
 *
 * Nothing enforces this list at sign-in yet — that lives in the auth flow,
 * which is covered by the login freeze — so an entry here records an intent
 * rather than restricting anything. Worth knowing before it is presented to
 * anyone as a security control.
 *
 * The two lockout guards are in place ahead of that, deliberately: they are
 * what make enforcement safe to switch on, and adding them afterwards means a
 * window in which one request can lock somebody out of their own account.
 */
@ApiTags('allowed-ips')
@Controller('user/allowed-ips')
export class AllowedIpsController {
  constructor(private readonly allowedIps: AllowedIpsService) {}

  @ApiOperation({ summary: "List the caller's allowed IP addresses" })
  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.allowedIps.list(user.sub);
  }

  @ApiOperation({ summary: 'Add one address or range' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAllowedIpDto) {
    return this.allowedIps.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Add many at once (CSV import)' })
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  createMany(
    @CurrentUser() user: JwtUser,
    @Body() dto: BulkCreateAllowedIpsDto,
  ) {
    return this.allowedIps.createMany(user.sub, dto.entries);
  }

  @ApiOperation({ summary: 'Edit an address or its description' })
  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAllowedIpDto,
  ) {
    return this.allowedIps.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Remove one entry' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.allowedIps.remove(user.sub, id, resolveCallerIp(req));
  }

  /**
   * The IP-restriction master switch.
   *
   * Its own route rather than the generic user update, because switching it on
   * has to be refused when the caller's address is not covered — a check that
   * needs the allow-list, and that a general-purpose profile PATCH has no
   * business carrying.
   */
  @ApiOperation({ summary: 'Turn IP restriction on or off' })
  @Patch('settings/enabled')
  setEnabled(
    @CurrentUser() user: JwtUser,
    @Body() dto: SetIpRestrictionDto,
    @Req() req: Request,
  ) {
    return this.allowedIps.setRestrictionEnabled(
      user.sub,
      dto.enabled,
      resolveCallerIp(req),
    );
  }
}

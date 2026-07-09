import { Controller, Get, Post, Delete, Query, Body, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { SearchService } from './search.service'
import { SearchDto, IndexRecordDto, SearchCategory } from '../dto/search.dto'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { FACET_FIELDS, FILTER_ENUMS } from '../config/search-config'

@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  search(@Query() dto: SearchDto) {
    return this.svc.search(dto)
  }

  @Get('facets')
  getFacets(@Query('category') category?: SearchCategory) {
    if (category && category !== SearchCategory.ALL && FACET_FIELDS[category]) {
      return { category, fields: FACET_FIELDS[category], enums: FILTER_ENUMS }
    }
    return { fields: FACET_FIELDS, enums: FILTER_ENUMS }
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'search-service' }
  }

  // Index management (called by other services via RabbitMQ or REST)
  @Post('index')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  index(@Body() dto: IndexRecordDto) {
    return this.svc.indexRecord(dto.indexName, dto.objectID, dto.record)
  }

  @Post('index/:index/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('index') index: string,
    @Param('id') id: string,
    @Body() attributes: Record<string, any>,
  ) {
    return this.svc.updateRecord(index, id, attributes)
  }

  @Delete('index/:index/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('index') index: string, @Param('id') id: string) {
    return this.svc.removeRecord(index, id)
  }

  // RabbitMQ
  @MessagePattern('search.query')
  handleSearch(@Payload() dto: SearchDto) {
    return this.svc.search(dto)
  }

  @MessagePattern('search.index')
  handleIndex(@Payload() dto: IndexRecordDto) {
    return this.svc.indexRecord(dto.indexName, dto.objectID, dto.record)
  }

  @MessagePattern('search.remove')
  handleRemove(@Payload() data: { indexName: string; objectID: string }) {
    return this.svc.removeRecord(data.indexName, data.objectID)
  }
}

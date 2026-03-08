import { Controller, Get, Post, Delete, Query, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { SearchService } from './search.service'
import { SearchDto, IndexRecordDto } from '../dto/search.dto'

@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  search(@Query() dto: SearchDto) {
    return this.svc.search(dto)
  }

  // Index management (called by other services via RabbitMQ or REST)
  @Post('index')
  @HttpCode(HttpStatus.OK)
  index(@Body() dto: IndexRecordDto) {
    return this.svc.indexRecord(dto.indexName, dto.objectID, dto.record)
  }

  @Post('index/:index/:id')
  update(
    @Param('index') index: string,
    @Param('id') id: string,
    @Body() attributes: Record<string, any>,
  ) {
    return this.svc.updateRecord(index, id, attributes)
  }

  @Delete('index/:index/:id')
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

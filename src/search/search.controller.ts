import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
@ApiTags('Search') @Controller('search')
export class SearchController {
  constructor(private s: SearchService) {}
  @Get() @ApiOperation({ summary: '全站搜尋' })
  async search(@Query('q') q: string) { return this.s.search(q); }
}

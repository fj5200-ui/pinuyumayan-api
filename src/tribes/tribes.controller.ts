import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TribesService } from './tribes.service';

@ApiTags('Tribes')
@Controller('tribes')
export class TribesController {
  constructor(private tribesService: TribesService) {}

  @Get()
  @ApiOperation({ summary: '取得所有部落' })
  async findAll() {
    const tribes = await this.tribesService.findAll();
    return { tribes };
  }

  @Get(':id')
  @ApiOperation({ summary: '取得單一部落詳情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tribesService.findOne(id);
  }
}

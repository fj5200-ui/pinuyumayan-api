import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get() @ApiOperation({ summary: '取得活動列表' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('type') type?: string, @Query('upcoming') upcoming?: string) {
    return this.eventsService.findAll(parseInt(page || '1'), parseInt(limit || '10'), type, upcoming === 'true');
  }

  @Get(':id') @ApiOperation({ summary: '取得單一活動' })
  async findOne(@Param('id', ParseIntPipe) id: number) { return this.eventsService.findOne(id); }

  @Post() @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '新增活動' })
  async create(@Body() body: any, @Req() req: any) { return this.eventsService.create(body, req.user.id); }

  @Put(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '更新活動' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) { return this.eventsService.update(id, body, req.user.id, req.user.role); }

  @Delete(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '刪除活動' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.eventsService.remove(id, req.user.id, req.user.role); }
}

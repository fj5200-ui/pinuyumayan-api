import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
@ApiTags('Media') @Controller('media')
export class MediaController {
  constructor(private s: MediaService) {}
  @Get() @ApiOperation({ summary: '取得媒體列表' }) async findAll(@Query('page') p?: string, @Query('limit') l?: string, @Query('type') t?: string) { return this.s.findAll(parseInt(p||'1'), parseInt(l||'20'), t); }
  @Get(':id') @ApiOperation({ summary: '取得單一媒體' }) async findOne(@Param('id', ParseIntPipe) id: number) { return this.s.findOne(id); }
  @Post() @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '新增媒體' }) async create(@Body() b: any, @Req() r: any) { return this.s.create(b, r.user.id); }
  @Put(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '更新媒體' }) async update(@Param('id', ParseIntPipe) id: number, @Body() b: any) { return this.s.update(id, b); }
  @Delete(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '刪除媒體' }) async remove(@Param('id', ParseIntPipe) id: number) { return this.s.remove(id); }
}

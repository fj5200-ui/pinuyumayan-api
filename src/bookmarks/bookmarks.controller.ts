import { Controller, Get, Post, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
@ApiTags('Bookmarks') @Controller('bookmarks')
export class BookmarksController {
  constructor(private s: BookmarksService) {}
  @Get() @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '取得收藏列表' })
  async findAll(@Req() req: any, @Query('page') p?: string) { return this.s.findAll(req.user.id, parseInt(p||'1')); }
  @Post(':articleId') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '切換收藏' })
  async toggle(@Param('articleId', ParseIntPipe) articleId: number, @Req() req: any) { return this.s.toggle(req.user.id, articleId); }
  @Get('check/:articleId') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '檢查是否已收藏' })
  async check(@Param('articleId', ParseIntPipe) articleId: number, @Req() req: any) { return this.s.check(req.user.id, articleId); }
}

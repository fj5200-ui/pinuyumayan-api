import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/jwt-auth.guard';
@ApiTags('Comments') @Controller('comments')
export class CommentsController {
  constructor(private s: CommentsService) {}
  @Get('article/:articleId') @UseGuards(OptionalJwtAuthGuard) @ApiOperation({ summary: '取得文章留言' })
  async getForArticle(@Param('articleId', ParseIntPipe) articleId: number, @Req() req: any) { return this.s.getForArticle(articleId, req.user?.id); }
  @Post('article/:articleId') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '新增留言' })
  async addComment(@Param('articleId', ParseIntPipe) articleId: number, @Req() req: any, @Body() body: any) { return this.s.addComment(articleId, req.user.id, body.content); }
  @Delete(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '刪除留言' })
  async deleteComment(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.s.deleteComment(id, req.user.id, req.user.role); }
  @Post('article/:articleId/like') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '切換按讚' })
  async toggleLike(@Param('articleId', ParseIntPipe) articleId: number, @Req() req: any) { return this.s.toggleLike(articleId, req.user.id); }
}

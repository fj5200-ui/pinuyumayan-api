import { Controller, Get, Put, Delete, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
@ApiTags('Notifications') @Controller('notifications')
export class NotificationsController {
  constructor(private s: NotificationsService) {}
  @Get() @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '取得通知列表' })
  async findAll(@Req() req: any, @Query('page') p?: string) { return this.s.findAll(req.user.id, parseInt(p||'1')); }
  @Get('unread-count') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '取得未讀數量' })
  async getUnreadCount(@Req() req: any) { return this.s.getUnreadCount(req.user.id); }
  @Put('read-all') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '全部已讀' })
  async markAllRead(@Req() req: any) { return this.s.markAllRead(req.user.id); }
  @Put(':id/read') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '標記為已讀' })
  async markRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.s.markRead(id, req.user.id); }
  @Delete(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '刪除通知' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.s.remove(id, req.user.id); }
}

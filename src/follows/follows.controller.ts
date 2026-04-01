import { Controller, Get, Post, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
@ApiTags('Follows') @Controller('follows')
export class FollowsController {
  constructor(private s: FollowsService) {}
  @Get() @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '取得追蹤列表' })
  async findAll(@Req() req: any) { return this.s.findAll(req.user.id); }
  @Post(':tribeId') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '切換追蹤' })
  async toggle(@Param('tribeId', ParseIntPipe) tribeId: number, @Req() req: any) { return this.s.toggle(req.user.id, tribeId); }
  @Get('check/:tribeId') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: '檢查是否已追蹤' })
  async check(@Param('tribeId', ParseIntPipe) tribeId: number, @Req() req: any) { return this.s.check(req.user.id, tribeId); }
  @Get('tribe/:tribeId/count') @ApiOperation({ summary: '取得部落追蹤人數' })
  async getCount(@Param('tribeId', ParseIntPipe) tribeId: number) { return this.s.getCount(tribeId); }
}

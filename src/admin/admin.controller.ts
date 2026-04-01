import { Controller, Get, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/jwt-auth.guard';
@ApiTags('Admin') @Controller('admin')
export class AdminController {
  constructor(private s: AdminService) {}
  @Get('users') @UseGuards(AdminGuard) @ApiBearerAuth() @ApiOperation({ summary: '取得用戶列表' })
  async getUsers(@Query('page') p?: string) { return this.s.getUsers(parseInt(p||'1')); }
  @Put('users/:id/role') @UseGuards(AdminGuard) @ApiBearerAuth() @ApiOperation({ summary: '更新用戶角色' })
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.s.updateRole(id, body.role); }
  @Get('comments') @UseGuards(AdminGuard) @ApiBearerAuth() @ApiOperation({ summary: '取得所有留言' })
  async getComments(@Query('page') p?: string) { return this.s.getComments(parseInt(p||'1')); }
  @Delete('comments/:id') @UseGuards(AdminGuard) @ApiBearerAuth() @ApiOperation({ summary: '刪除留言' })
  async deleteComment(@Param('id', ParseIntPipe) id: number) { return this.s.deleteComment(id); }
}

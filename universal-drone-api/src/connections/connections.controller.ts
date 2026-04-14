import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('連線管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ConnectionsController {
  constructor(private readonly svc: ConnectionsService) {}

  @Get('drones/:droneId/connections')
  @ApiOperation({ summary: '取得無人機連線設定清單' })
  findByDrone(@Param('droneId', ParseIntPipe) droneId: number) {
    return this.svc.findByDrone(droneId);
  }

  @Post('drones/:droneId/connections')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增連線設定' })
  create(@Param('droneId', ParseIntPipe) droneId: number, @Body() dto: any) {
    return this.svc.create(droneId, dto);
  }

  @Patch('connections/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '更新連線設定' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete('connections/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '刪除連線設定' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  @Post('connections/:id/connect')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '建立連線（啟動適配器）' })
  connect(@Param('id', ParseIntPipe) id: number) {
    return this.svc.connect(id);
  }

  @Post('connections/:id/disconnect')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '斷開連線' })
  disconnect(@Param('id', ParseIntPipe) id: number) {
    return this.svc.disconnect(id);
  }
}

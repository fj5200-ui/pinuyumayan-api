import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('飛行任務')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly svc: MissionsService) {}

  @Get()
  @ApiOperation({ summary: '取得任務清單' })
  @ApiQuery({ name: 'droneId', required: false, type: Number })
  findAll(@Query('droneId') droneId?: string) {
    return this.svc.findAll(droneId ? parseInt(droneId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得任務詳情（含航點）' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '建立任務（含地理圍欄驗證）' })
  create(@Body() dto: any, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '更新任務' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '刪除任務' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.svc.delete(id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '開始執行任務' })
  startMission(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.svc.startMission(id, userId);
  }

  @Post(':id/abort')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '中止任務' })
  abortMission(@Param('id', ParseIntPipe) id: number) {
    return this.svc.abortMission(id);
  }

  @Post(':id/waypoints')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增航點' })
  addWaypoint(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.addWaypoint(id, dto);
  }
}

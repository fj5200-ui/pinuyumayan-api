import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FlightLogsService } from './flight-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('飛行紀錄')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('flight-logs')
export class FlightLogsController {
  constructor(private readonly svc: FlightLogsService) {}

  @Get()
  @ApiOperation({ summary: '取得飛行紀錄清單' })
  @ApiQuery({ name: 'droneId', required: false, type: Number })
  findAll(@Query('droneId') droneId?: string) {
    return this.svc.findAll(droneId ? parseInt(droneId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得飛行紀錄詳情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Get(':id/trajectory')
  @ApiOperation({ summary: '取得軌跡 GeoJSON（可用於地圖回放）' })
  getTrajectory(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getTrajectory(id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: '取得飛行事件時間線（告警、航點到達等）' })
  getEvents(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getEvents(id);
  }

  @Post(':id/events')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增飛行事件' })
  addEvent(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.addEvent(id, dto);
  }

  @Patch(':id/end')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '結束飛行（計算統計、生成軌跡）' })
  endFlight(@Param('id', ParseIntPipe) id: number, @Body() dto: { notes?: string }) {
    return this.svc.endFlight(id, dto.notes);
  }
}

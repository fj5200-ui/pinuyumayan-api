import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FpvMediaService } from './fpv-media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('FPV 媒體')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fpv-media')
export class FpvMediaController {
  constructor(private readonly svc: FpvMediaService) {}

  @Get()
  @ApiOperation({ summary: '取得媒體清單' })
  @ApiQuery({ name: 'droneId', required: false, type: Number })
  findAll(@Query('droneId') droneId?: string) {
    return this.svc.findAll(droneId ? parseInt(droneId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得媒體詳情' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post('streams')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '登記 RTSP 串流' })
  registerStream(@Body() dto: { droneId: number; rtspUrl: string; flightLogId?: number }) {
    return this.svc.registerStream(dto.droneId, dto.rtspUrl, dto.flightLogId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: '取得 S3 預簽名下載連結' })
  getDownloadUrl(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getDownloadUrl(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '刪除媒體紀錄' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}

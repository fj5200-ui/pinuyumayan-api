import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('資料匯出')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportController {
  constructor(private readonly svc: ExportService) {}

  @Post()
  @ApiOperation({ summary: '建立匯出任務（JSON / CSV / KML）' })
  create(
    @Body() dto: { format: string; entityType: string; entityIds: number[] },
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.createJob(userId, dto.format, dto.entityType, dto.entityIds);
  }

  @Get(':id')
  @ApiOperation({ summary: '查詢匯出任務狀態與下載連結' })
  getJob(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getJob(id);
  }
}

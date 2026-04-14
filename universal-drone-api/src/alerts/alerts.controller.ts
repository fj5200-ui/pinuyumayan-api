import { Controller, Get, Patch, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('告警管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly svc: AlertsService) {}

  @Get('drone/:droneId')
  @ApiOperation({ summary: '取得無人機告警紀錄' })
  findByDrone(@Param('droneId', ParseIntPipe) droneId: number) {
    return this.svc.findByDrone(droneId);
  }

  @Get('drone/:droneId/unresolved')
  @ApiOperation({ summary: '取得未解決告警' })
  findUnresolved(@Param('droneId', ParseIntPipe) droneId: number) {
    return this.svc.findUnresolved(droneId);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '標記告警為已解決' })
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.svc.resolve(id);
  }

  @Get('failsafe/:droneId')
  @ApiOperation({ summary: '取得無人機失控保護規則' })
  getFailsafeRules(@Param('droneId', ParseIntPipe) droneId: number) {
    return this.svc.getFailsafeRules(droneId);
  }

  @Post('failsafe/:droneId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增或更新失控保護規則' })
  upsertFailsafe(@Param('droneId', ParseIntPipe) droneId: number, @Body() dto: any) {
    return this.svc.upsertFailsafeRule(droneId, dto);
  }
}

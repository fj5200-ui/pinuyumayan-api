import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('維修保養')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  @Get('drones/:droneId/maintenance')
  @ApiOperation({ summary: '取得無人機維修保養紀錄' })
  getRecords(@Param('droneId', ParseIntPipe) droneId: number) {
    return this.svc.getRecordsByDrone(droneId);
  }

  @Post('drones/:droneId/maintenance')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增維修保養紀錄' })
  createRecord(
    @Param('droneId', ParseIntPipe) droneId: number,
    @Body() dto: any,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.createRecord(droneId, dto, userId);
  }

  @Patch('maintenance/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '更新維修紀錄' })
  updateRecord(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.updateRecord(id, dto);
  }

  @Get('drones/:droneId/batteries')
  @ApiOperation({ summary: '取得無人機電池清單' })
  getBatteries(@Param('droneId', ParseIntPipe) droneId: number) {
    return this.svc.getBatteriesByDrone(droneId);
  }

  @Post('batteries')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增電池' })
  createBattery(@Body() dto: any) { return this.svc.createBattery(dto); }

  @Patch('batteries/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '更新電池資訊（含循環次數）' })
  updateBattery(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.updateBattery(id, dto);
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FleetService } from './fleet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('編隊管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet-groups')
export class FleetController {
  constructor(private readonly svc: FleetService) {}

  @Get()
  @ApiOperation({ summary: '取得所有編隊群組' })
  findAll() { return this.svc.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: '取得編隊群組詳情（含成員清單）' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Get(':id/status')
  @ApiOperation({ summary: '取得編隊所有無人機即時狀態' })
  getFleetStatus(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getFleetStatus(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '建立編隊群組' })
  create(@Body() dto: any, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '更新編隊群組' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '刪除編隊群組' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增編隊成員' })
  addMember(@Param('id', ParseIntPipe) id: number, @Body() dto: { droneId: number; role?: string }) {
    return this.svc.addMember(id, dto.droneId, dto.role);
  }

  @Delete(':id/members/:droneId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '移除編隊成員' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('droneId', ParseIntPipe) droneId: number,
  ) {
    return this.svc.removeMember(id, droneId);
  }

  @Patch(':id/master')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '設定主控機' })
  setMaster(@Param('id', ParseIntPipe) id: number, @Body() dto: { droneId: number }) {
    return this.svc.setMasterDrone(id, dto.droneId);
  }
}

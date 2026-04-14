import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChecklistService } from './checklist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('飛前檢查')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly svc: ChecklistService) {}

  @Get('templates')
  @ApiOperation({ summary: '取得所有檢查清單範本' })
  findTemplates() { return this.svc.findTemplates(); }

  @Get('templates/:id/items')
  @ApiOperation({ summary: '取得範本檢查項目' })
  findItems(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findTemplateItems(id);
  }

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '建立檢查清單範本' })
  createTemplate(@Body() dto: any, @CurrentUser('id') userId: number) {
    return this.svc.createTemplate(dto, userId);
  }

  @Post('templates/:id/items')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增檢查項目到範本' })
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.addItem(id, dto);
  }

  @Post('runs')
  @ApiOperation({ summary: '執行飛前檢查（一鍵確認）' })
  runChecklist(@Body() dto: any, @CurrentUser('id') userId: number) {
    return this.svc.runChecklist({ ...dto, userId });
  }

  @Get('runs/drone/:droneId')
  @ApiOperation({ summary: '取得無人機飛前檢查紀錄' })
  getRunsByDrone(@Param('droneId', ParseIntPipe) droneId: number) {
    return this.svc.getRunsByDrone(droneId);
  }
}

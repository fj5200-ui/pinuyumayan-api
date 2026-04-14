import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DronesService } from './drones.service';
import { CreateDroneDto, UpdateDroneDto } from './drones.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('無人機管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService) {}

  @Get()
  @ApiOperation({ summary: '取得所有無人機清單（含即時狀態）' })
  findAll(@CurrentUser('id') userId: number) {
    return this.dronesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得單台無人機詳情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dronesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增無人機' })
  create(@Body() dto: CreateDroneDto, @CurrentUser('id') userId: number) {
    return this.dronesService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '更新無人機資訊' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDroneDto) {
    return this.dronesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '停用無人機' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dronesService.remove(id);
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GeofencingService } from './geofencing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

class CreateGeofenceDto {
  @ApiProperty({ example: '松山機場禁航區' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['no_fly', 'restricted', 'custom_geofence'] })
  @IsString()
  type: string;

  @ApiProperty({ description: 'GeoJSON Polygon 字串' })
  @IsString()
  boundaryGeojson: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxAltitudeM?: number;
}

@ApiTags('地理圍欄')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geofences')
export class GeofencingController {
  constructor(private readonly svc: GeofencingService) {}

  @Get()
  @ApiOperation({ summary: '取得所有活躍地理圍欄' })
  findAll() { return this.svc.findAll(); }

  @Get('check')
  @ApiOperation({ summary: '檢查指定座標是否在禁飛區內' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lon', type: Number })
  checkPoint(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
  ) {
    return this.svc.checkPoint(parseFloat(lat), parseFloat(lon));
  }

  @Get(':id')
  @ApiOperation({ summary: '取得單個地理圍欄' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '新增地理圍欄' })
  create(@Body() dto: CreateGeofenceDto, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '更新地理圍欄' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateGeofenceDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '刪除地理圍欄' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}

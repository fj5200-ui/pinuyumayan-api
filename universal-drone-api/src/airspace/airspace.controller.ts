import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AirspaceService } from './airspace.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('空域檢查')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('airspace')
export class AirspaceController {
  constructor(private readonly svc: AirspaceService) {}

  @Get('check')
  @ApiOperation({ summary: '檢查指定座標空域限制（OpenAIP）' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lon', type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: '檢查半徑（公里）' })
  checkAirspace(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radius') radius?: string,
  ) {
    return this.svc.checkAirspace(
      parseFloat(lat),
      parseFloat(lon),
      radius ? parseFloat(radius) : 5,
    );
  }
}

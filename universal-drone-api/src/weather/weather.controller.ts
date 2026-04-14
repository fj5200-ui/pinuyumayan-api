import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('天氣資訊')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('weather')
export class WeatherController {
  constructor(private readonly svc: WeatherService) {}

  @Get()
  @ApiOperation({ summary: '取得天氣資訊與飛行風險評估' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lon', type: Number })
  getWeather(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.svc.getWeather(parseFloat(lat), parseFloat(lon));
  }

  @Get('risk-assessment')
  @ApiOperation({ summary: '取得飛行風險評估（同 /weather）' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lon', type: Number })
  getRiskAssessment(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.svc.getWeather(parseFloat(lat), parseFloat(lon));
  }
}

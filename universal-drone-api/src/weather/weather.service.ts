import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { gt } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { weatherCache } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import axios from 'axios';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private config: ConfigService,
  ) {
    this.apiKey = config.get<string>('WEATHER_API_KEY', '');
  }

  async getWeather(lat: number, lon: number) {
    // 精度四捨五入到 0.01 度（約 1km）
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;

    // 查快取
    const cached = await this.db.select().from(weatherCache)
      .where(gt(weatherCache.expiresAt, new Date()))
      .limit(20);

    const match = cached.find(c =>
      Math.abs(c.latitude - roundedLat) < 0.01 &&
      Math.abs(c.longitude - roundedLon) < 0.01,
    );
    if (match) return this.formatResponse(match);

    // 呼叫 OpenWeatherMap API
    if (!this.apiKey) {
      return this.mockWeatherResponse(lat, lon);
    }

    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather`,
        {
          params: { lat, lon, appid: this.apiKey, units: 'metric' },
          timeout: 5000,
        },
      );
      const d = res.data;

      const windSpeedMps    = d.wind?.speed ?? 0;
      const windDirectionDeg = d.wind?.deg ?? 0;
      const precipitationMm = d.rain?.['1h'] ?? 0;
      const visibilityKm    = (d.visibility ?? 10000) / 1000;
      const temperatureC    = d.main?.temp ?? 20;
      const cloudCoverPct   = d.clouds?.all ?? 0;

      const { riskScore, riskFactors } = this.computeRisk(
        windSpeedMps, precipitationMm, visibilityKm, cloudCoverPct,
      );

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const [saved] = await this.db.insert(weatherCache).values({
        latitude: roundedLat, longitude: roundedLon,
        windSpeedMps, windDirectionDeg, precipitationMm,
        visibilityKm, temperatureC, cloudCoverPct,
        riskScore, riskFactors: JSON.stringify(riskFactors),
        expiresAt,
      }).returning();

      return this.formatResponse(saved);
    } catch (err: any) {
      this.logger.warn(`天氣 API 呼叫失敗：${err.message}，使用模擬資料`);
      return this.mockWeatherResponse(lat, lon);
    }
  }

  private computeRisk(wind: number, rain: number, vis: number, cloud: number) {
    let score = 0;
    const factors: string[] = [];

    if (wind > 10) { score += 30; factors.push(`強風（${wind.toFixed(1)} m/s）`); }
    else if (wind > 6) { score += 10; factors.push(`微風偏強（${wind.toFixed(1)} m/s）`); }

    if (rain > 0) { score += 20; factors.push(`有降雨（${rain} mm/hr）`); }
    if (vis < 1)  { score += 30; factors.push(`能見度極低（${vis.toFixed(1)} km）`); }
    else if (vis < 3) { score += 15; factors.push(`能見度低（${vis.toFixed(1)} km）`); }

    if (cloud > 80) { score += 10; factors.push(`雲量高（${cloud}%）`); }

    return { riskScore: Math.min(score, 100), riskFactors: factors };
  }

  private formatResponse(cache: any) {
    return {
      latitude:         cache.latitude,
      longitude:        cache.longitude,
      windSpeedMps:     cache.windSpeedMps,
      windDirectionDeg: cache.windDirectionDeg,
      precipitationMm:  cache.precipitationMm,
      visibilityKm:     cache.visibilityKm,
      temperatureC:     cache.temperatureC,
      cloudCoverPct:    cache.cloudCoverPct,
      riskScore:        cache.riskScore,
      riskFactors:      cache.riskFactors ? JSON.parse(cache.riskFactors) : [],
      riskLevel:        cache.riskScore >= 60 ? '高風險' : cache.riskScore >= 30 ? '中風險' : '低風險',
      flightAdvice:     cache.riskScore >= 60 ? '不建議飛行' : cache.riskScore >= 30 ? '謹慎飛行' : '可以飛行',
      cachedAt:         cache.fetchedAt,
    };
  }

  private mockWeatherResponse(lat: number, lon: number) {
    const { riskScore, riskFactors } = this.computeRisk(3, 0, 10, 20);
    return {
      latitude: lat, longitude: lon,
      windSpeedMps: 3, windDirectionDeg: 180,
      precipitationMm: 0, visibilityKm: 10,
      temperatureC: 25, cloudCoverPct: 20,
      riskScore, riskFactors,
      riskLevel: '低風險', flightAdvice: '可以飛行',
      note: '天氣 API 未設定，使用模擬資料',
    };
  }
}

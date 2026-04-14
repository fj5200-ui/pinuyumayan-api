import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS } from '../redis/redis.module';
import type Redis from 'ioredis';
import axios from 'axios';

@Injectable()
export class AirspaceService {
  private readonly logger = new Logger(AirspaceService.name);
  private readonly apiKey: string;

  constructor(
    @Inject(REDIS) private redis: Redis,
    private config: ConfigService,
  ) {
    this.apiKey = config.get<string>('OPENAIP_API_KEY', '');
  }

  async checkAirspace(lat: number, lon: number, radiusKm = 5) {
    const cacheKey = `airspace:${Math.round(lat * 100) / 100}:${Math.round(lon * 100) / 100}`;

    // 讀 Redis 快取（1 小時）
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    if (!this.apiKey) {
      const result = {
        safe: true,
        message: '空域檢查服務未設定（OPENAIP_API_KEY 未配置）',
        restrictions: [],
        checkedAt: new Date().toISOString(),
      };
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      return result;
    }

    try {
      const res = await axios.get('https://api.openaip.net/api/airspaces', {
        params: {
          apiKey: this.apiKey,
          latitude: lat,
          longitude: lon,
          radius: radiusKm,
        },
        timeout: 8000,
      });

      const airspaces = res.data?.items || [];
      const restrictions = airspaces.map((a: any) => ({
        name:     a.name,
        type:     a.type,
        category: a.category,
        lowerAlt: a.geometry?.lowerLimit,
        upperAlt: a.geometry?.upperLimit,
      }));

      const hasNoFly = restrictions.some((r: any) =>
        ['PROHIBITED', 'DANGER', 'RESTRICTED'].includes(r.category),
      );

      const result = {
        safe: !hasNoFly,
        message: hasNoFly
          ? `空域內有限制區域：${restrictions.map((r: any) => r.name).join('、')}`
          : '空域安全，可執行飛行任務',
        restrictions,
        checkedAt: new Date().toISOString(),
      };

      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      return result;
    } catch (err: any) {
      this.logger.warn(`空域 API 呼叫失敗：${err.message}`);
      const result = {
        safe: true,
        message: '空域 API 暫時無法使用，請手動確認空域狀況',
        restrictions: [],
        error: err.message,
        checkedAt: new Date().toISOString(),
      };
      await this.redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 分鐘快取
      return result;
    }
  }
}

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { fpvMedia } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FpvMediaService {
  private s3: S3Client | null = null;
  private bucket: string;

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private config: ConfigService,
  ) {
    const region = config.get<string>('AWS_REGION');
    this.bucket  = config.get<string>('S3_BUCKET', '');
    if (region && this.bucket) {
      this.s3 = new S3Client({ region });
    }
  }

  async findAll(droneId?: number) {
    if (droneId) {
      return this.db.select().from(fpvMedia).where(eq(fpvMedia.droneId, droneId));
    }
    return this.db.select().from(fpvMedia);
  }

  async findOne(id: number) {
    const [m] = await this.db.select().from(fpvMedia).where(eq(fpvMedia.id, id)).limit(1);
    if (!m) throw new NotFoundException(`找不到媒體紀錄 #${id}`);
    return m;
  }

  async registerStream(droneId: number, rtspUrl: string, flightLogId?: number) {
    const [m] = await this.db.insert(fpvMedia).values({
      droneId,
      flightLogId: flightLogId || null,
      type: 'video',
      filename: `stream_${droneId}_${Date.now()}`,
      rtspUrl,
      capturedAt: new Date(),
    }).returning();
    return m;
  }

  async create(droneId: number, data: any) {
    const [m] = await this.db.insert(fpvMedia).values({
      droneId,
      ...data,
      capturedAt: data.capturedAt ? new Date(data.capturedAt) : new Date(),
    }).returning();
    return m;
  }

  async getDownloadUrl(id: number): Promise<{ url: string; expiresIn: number }> {
    const media = await this.findOne(id);
    if (!media.storageUrl) {
      throw new NotFoundException('此媒體尚未上傳至雲端儲存');
    }

    if (!this.s3 || !this.bucket) {
      return { url: media.storageUrl, expiresIn: 0 };
    }

    // 從 storageUrl 解析 S3 key
    const key = media.storageUrl.replace(`https://${this.bucket}.s3.amazonaws.com/`, '');
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { url, expiresIn: 3600 };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(fpvMedia).where(eq(fpvMedia.id, id));
    return { message: '媒體已刪除' };
  }
}

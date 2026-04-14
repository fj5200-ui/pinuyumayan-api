import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { exportJobs, flightLogs, missions, fpvMedia } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
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

  async createJob(requestedById: number, format: string, entityType: string, entityIds: number[]) {
    const [job] = await this.db.insert(exportJobs).values({
      requestedById,
      format: format as any,
      entityType,
      entityIds: JSON.stringify(entityIds),
      status: 'pending',
    }).returning();

    // 非同步處理（實際部署可用 BullMQ 佇列）
    this.processJob(job.id).catch(err =>
      this.logger.error(`匯出任務 #${job.id} 失敗：${err.message}`),
    );

    return job;
  }

  async getJob(id: number) {
    const [job] = await this.db.select().from(exportJobs)
      .where(eq(exportJobs.id, id)).limit(1);
    if (!job) throw new NotFoundException(`找不到匯出任務 #${id}`);
    return job;
  }

  private async processJob(jobId: number): Promise<void> {
    await this.db.update(exportJobs).set({ status: 'processing' })
      .where(eq(exportJobs.id, jobId));

    try {
      const [job] = await this.db.select().from(exportJobs)
        .where(eq(exportJobs.id, jobId)).limit(1);
      const entityIds: number[] = JSON.parse(job.entityIds);

      const data = await this.fetchData(job.entityType, entityIds);
      const { content, contentType, ext } = this.serialize(data, job.format, job.entityType);

      const filename = `exports/${job.entityType}_${jobId}_${Date.now()}.${ext}`;
      let downloadUrl: string;

      if (this.s3 && this.bucket) {
        await this.s3.send(new PutObjectCommand({
          Bucket:      this.bucket,
          Key:         filename,
          Body:        content,
          ContentType: contentType,
        }));
        const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: filename });
        downloadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 86400 });
      } else {
        // 無 S3：回傳 base64 inline URL
        const b64 = Buffer.from(content).toString('base64');
        downloadUrl = `data:${contentType};base64,${b64}`;
      }

      await this.db.update(exportJobs).set({
        status: 'completed',
        downloadUrl,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).where(eq(exportJobs.id, jobId));

    } catch (err: any) {
      this.logger.error(`處理匯出任務 #${jobId} 失敗：${err.message}`);
      await this.db.update(exportJobs).set({ status: 'failed' })
        .where(eq(exportJobs.id, jobId));
    }
  }

  private async fetchData(entityType: string, ids: number[]) {
    switch (entityType) {
      case 'flight_log':
        return Promise.all(ids.map(id =>
          this.db.select().from(flightLogs).where(eq(flightLogs.id, id)).limit(1)
            .then(r => r[0]),
        ));
      case 'mission':
        return Promise.all(ids.map(id =>
          this.db.select().from(missions).where(eq(missions.id, id)).limit(1)
            .then(r => r[0]),
        ));
      case 'media':
        return Promise.all(ids.map(id =>
          this.db.select().from(fpvMedia).where(eq(fpvMedia.id, id)).limit(1)
            .then(r => r[0]),
        ));
      default:
        return [];
    }
  }

  private serialize(data: any[], format: string, entityType: string): {
    content: string; contentType: string; ext: string;
  } {
    switch (format) {
      case 'json':
        return {
          content: JSON.stringify(data, null, 2),
          contentType: 'application/json',
          ext: 'json',
        };
      case 'csv': {
        if (data.length === 0) return { content: '', contentType: 'text/csv', ext: 'csv' };
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
          Object.values(row).map(v =>
            v === null ? '' : `"${String(v).replace(/"/g, '""')}"`,
          ).join(','),
        );
        return {
          content: [headers, ...rows].join('\n'),
          contentType: 'text/csv',
          ext: 'csv',
        };
      }
      case 'kml': {
        const placemarks = data
          .filter((d: any) => d?.startLatitude && d?.startLongitude)
          .map((d: any) => `
  <Placemark>
    <name>${d.id}</name>
    <Point><coordinates>${d.startLongitude},${d.startLatitude},0</coordinates></Point>
  </Placemark>`).join('');
        return {
          content: `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><name>${entityType} export</name>${placemarks}
  </Document>
</kml>`,
          contentType: 'application/vnd.google-earth.kml+xml',
          ext: 'kml',
        };
      }
      default:
        return { content: JSON.stringify(data), contentType: 'application/json', ext: 'json' };
    }
  }
}

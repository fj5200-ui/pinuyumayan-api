import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { flightLogs, flightLogEvents, telemetrySnapshots, missions } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class FlightLogsService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(droneId?: number) {
    if (droneId) {
      return this.db.select().from(flightLogs).where(eq(flightLogs.droneId, droneId));
    }
    return this.db.select().from(flightLogs);
  }

  async findOne(id: number) {
    const [log] = await this.db.select().from(flightLogs).where(eq(flightLogs.id, id)).limit(1);
    if (!log) throw new NotFoundException(`找不到飛行紀錄 #${id}`);
    return log;
  }

  async getTrajectory(id: number) {
    const log = await this.findOne(id);

    if (log.trajectoryGeojson) {
      return JSON.parse(log.trajectoryGeojson);
    }

    // 從遙測快照重建軌跡
    const snapshots = await this.db.select({
      latitude:  telemetrySnapshots.latitude,
      longitude: telemetrySnapshots.longitude,
      altitudeMeters: telemetrySnapshots.altitudeMeters,
      recordedAt: telemetrySnapshots.recordedAt,
    }).from(telemetrySnapshots)
      .where(eq(telemetrySnapshots.flightLogId, id))
      .orderBy(asc(telemetrySnapshots.recordedAt));

    return {
      type: 'LineString',
      coordinates: snapshots
        .filter(s => s.latitude && s.longitude)
        .map(s => [s.longitude, s.latitude, s.altitudeMeters || 0]),
      properties: {
        flightLogId: id,
        pointCount: snapshots.length,
      },
    };
  }

  async getEvents(id: number) {
    await this.findOne(id);
    return this.db.select().from(flightLogEvents)
      .where(eq(flightLogEvents.flightLogId, id))
      .orderBy(asc(flightLogEvents.recordedAt));
  }

  async addEvent(flightLogId: number, data: any) {
    await this.findOne(flightLogId);
    const [event] = await this.db.insert(flightLogEvents).values({
      flightLogId,
      ...data,
    }).returning();
    return event;
  }

  async endFlight(id: number, notes?: string) {
    const log = await this.findOne(id);
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - log.startedAt.getTime()) / 1000);

    // 從遙測快照計算統計
    const snapshots = await this.db.select().from(telemetrySnapshots)
      .where(eq(telemetrySnapshots.flightLogId, id))
      .orderBy(asc(telemetrySnapshots.recordedAt));

    let maxAltitudeM = 0;
    let maxSpeedMps = 0;
    let distanceKm = 0;
    let prevLat: number | null = null;
    let prevLon: number | null = null;
    const coords: number[][] = [];

    for (const snap of snapshots) {
      if (snap.altitudeMeters && snap.altitudeMeters > maxAltitudeM) {
        maxAltitudeM = snap.altitudeMeters;
      }
      if (snap.speedMps && snap.speedMps > maxSpeedMps) {
        maxSpeedMps = snap.speedMps;
      }
      if (snap.latitude && snap.longitude) {
        coords.push([snap.longitude, snap.latitude, snap.altitudeMeters || 0]);
        if (prevLat !== null && prevLon !== null) {
          distanceKm += this.haversineKm(prevLat, prevLon, snap.latitude, snap.longitude);
        }
        prevLat = snap.latitude;
        prevLon = snap.longitude;
      }
    }

    const trajectoryGeojson = coords.length > 1
      ? JSON.stringify({ type: 'LineString', coordinates: coords })
      : null;

    const [updated] = await this.db.update(flightLogs).set({
      endedAt: now,
      durationSeconds,
      maxAltitudeM,
      maxSpeedMps,
      distanceKm: Math.round(distanceKm * 1000) / 1000,
      trajectoryGeojson,
      notes: notes || log.notes,
    }).where(eq(flightLogs.id, id)).returning();

    return updated;
  }

  /** Haversine 公式計算兩點距離（公里） */
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

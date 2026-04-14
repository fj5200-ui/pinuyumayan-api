import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { missions, waypoints, flightLogs } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import { GeofencingService } from '../geofencing/geofencing.service';
import { DroneAdapterRegistry } from '../adapters/drone-adapter.registry';

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private readonly geofencing: GeofencingService,
    private readonly registry: DroneAdapterRegistry,
  ) {}

  async findAll(droneId?: number) {
    if (droneId) {
      return this.db.select().from(missions).where(eq(missions.droneId, droneId));
    }
    return this.db.select().from(missions);
  }

  async findOne(id: number) {
    const [mission] = await this.db.select().from(missions).where(eq(missions.id, id)).limit(1);
    if (!mission) throw new NotFoundException(`找不到任務 #${id}`);

    const missionWaypoints = await this.db.select().from(waypoints)
      .where(eq(waypoints.missionId, id))
      .orderBy(waypoints.sequence);

    return { ...mission, waypoints: missionWaypoints };
  }

  async create(data: any, userId: number) {
    const { waypoints: wps, ...missionData } = data;

    // 檢查地理圍欄衝突
    if (wps?.length > 0) {
      const check = await this.geofencing.checkMission(wps);
      if (!check.safe) {
        throw new BadRequestException(
          `任務航點進入禁飛區：${check.violations.map(v =>
            `航點 ${v.waypointIndex + 1} 進入 ${v.zones.map((z: any) => z.name).join('、')}`
          ).join('；')}`
        );
      }
    }

    const [mission] = await this.db.insert(missions).values({
      ...missionData,
      createdById: userId,
    }).returning();

    if (wps?.length > 0) {
      await this.db.insert(waypoints).values(
        wps.map((wp: any, idx: number) => ({
          missionId:      mission.id,
          sequence:       wp.sequence ?? idx,
          latitude:       wp.latitude,
          longitude:      wp.longitude,
          altitudeMeters: wp.altitudeMeters,
          speedMps:       wp.speedMps,
          hoverSeconds:   wp.hoverSeconds ?? 0,
          action:         wp.action ?? 'hover',
          gimbalPitch:    wp.gimbalPitch,
          heading:        wp.heading,
        }))
      );
    }

    return this.findOne(mission.id);
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    const [updated] = await this.db.update(missions).set({ ...data, updatedAt: new Date() })
      .where(eq(missions.id, id)).returning();
    return updated;
  }

  async delete(id: number) {
    const mission = await this.findOne(id);
    if (mission.status === 'executing') {
      throw new BadRequestException('任務執行中，無法刪除');
    }
    await this.db.delete(missions).where(eq(missions.id, id));
    return { message: '任務已刪除' };
  }

  async startMission(id: number, operatorId: number) {
    const mission = await this.findOne(id);
    if (!mission.droneId) throw new BadRequestException('任務未指定無人機');

    // 上傳航點到無人機
    const adapter = this.registry.get(mission.droneId);
    await adapter.uploadMission({
      waypoints: mission.waypoints.map(wp => ({
        sequence:       wp.sequence,
        latitude:       wp.latitude,
        longitude:      wp.longitude,
        altitudeMeters: wp.altitudeMeters,
        speedMps:       wp.speedMps || undefined,
        hoverSeconds:   wp.hoverSeconds || 0,
        action:         wp.action || 'hover',
      })),
      returnHomeAltM: mission.homeAltitude || 30,
    });

    await adapter.startMission();

    // 更新任務狀態
    await this.db.update(missions).set({ status: 'executing', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(missions.id, id));

    // 建立飛行紀錄
    const [log] = await this.db.insert(flightLogs).values({
      droneId:    mission.droneId,
      missionId:  id,
      operatorId,
      startedAt:  new Date(),
    }).returning();

    this.logger.log(`任務 #${id} 已開始，飛行紀錄 #${log.id}`);
    return { message: '任務已開始', flightLogId: log.id };
  }

  async abortMission(id: number) {
    const mission = await this.findOne(id);
    if (!mission.droneId) throw new BadRequestException('任務未指定無人機');

    const adapter = this.registry.tryGet(mission.droneId);
    if (adapter?.isConnected()) {
      await adapter.abortMission();
    }

    await this.db.update(missions).set({ status: 'aborted', updatedAt: new Date() })
      .where(eq(missions.id, id));

    return { message: '任務已中止' };
  }

  async addWaypoint(missionId: number, data: any) {
    await this.findOne(missionId);
    const [wp] = await this.db.insert(waypoints).values({ missionId, ...data }).returning();
    return wp;
  }
}

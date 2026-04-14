import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { geofences } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

interface GeoPoint { lat: number; lon: number; }
type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };

@Injectable()
export class GeofencingService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.select().from(geofences).where(eq(geofences.isActive, true));
  }

  async findOne(id: number) {
    const [g] = await this.db.select().from(geofences).where(eq(geofences.id, id)).limit(1);
    return g;
  }

  async create(data: any, userId: number) {
    const [g] = await this.db.insert(geofences).values({ ...data, createdById: userId }).returning();
    return g;
  }

  async update(id: number, data: any) {
    const [g] = await this.db.update(geofences).set({ ...data, updatedAt: new Date() })
      .where(eq(geofences.id, id)).returning();
    return g;
  }

  async remove(id: number) {
    await this.db.update(geofences).set({ isActive: false, updatedAt: new Date() })
      .where(eq(geofences.id, id));
    return { message: '地理圍欄已刪除' };
  }

  /**
   * 點是否在任何活躍的禁飛區或限飛區內
   * 使用 Ray Casting 演算法（純 TypeScript，不需 PostGIS）
   */
  async checkPoint(lat: number, lon: number): Promise<{ inside: boolean; zones: any[] }> {
    const activeZones = await this.db.select().from(geofences)
      .where(and(eq(geofences.isActive, true)));

    const insideZones = activeZones.filter(zone => {
      try {
        const polygon: GeoJsonPolygon = JSON.parse(zone.boundaryGeojson);
        return this.isPointInPolygon({ lat, lon }, polygon.coordinates[0]);
      } catch {
        return false;
      }
    });

    return {
      inside: insideZones.length > 0,
      zones:  insideZones,
    };
  }

  /**
   * 檢查任務所有航點是否進入禁飛區
   */
  async checkMission(waypoints: Array<{ latitude: number; longitude: number }>): Promise<{
    safe: boolean;
    violations: Array<{ waypointIndex: number; zones: any[] }>;
  }> {
    const violations: Array<{ waypointIndex: number; zones: any[] }> = [];

    for (let i = 0; i < waypoints.length; i++) {
      const { inside, zones } = await this.checkPoint(
        waypoints[i].latitude,
        waypoints[i].longitude,
      );
      if (inside) {
        violations.push({ waypointIndex: i, zones });
      }
    }

    return { safe: violations.length === 0, violations };
  }

  /**
   * Ray Casting 點在多邊形演算法
   * @param point 檢查的點 { lat, lon }
   * @param polygon GeoJSON 多邊形頂點陣列 [[lon, lat], ...]
   */
  private isPointInPolygon(point: GeoPoint, polygon: number[][]): boolean {
    let inside = false;
    const x = point.lon;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }
}

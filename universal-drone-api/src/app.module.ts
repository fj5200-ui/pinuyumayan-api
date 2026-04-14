import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { AdaptersModule } from './adapters/adapters.module';
import { DronesModule } from './drones/drones.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ControlModule } from './control/control.module';
import { GeofencingModule } from './geofencing/geofencing.module';
import { AlertsModule } from './alerts/alerts.module';
import { MissionsModule } from './missions/missions.module';
import { FlightLogsModule } from './flight-logs/flight-logs.module';
import { ConnectionsModule } from './connections/connections.module';
import { FleetModule } from './fleet/fleet.module';
import { FpvMediaModule } from './fpv-media/fpv-media.module';
import { ChecklistModule } from './checklist/checklist.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { WeatherModule } from './weather/weather.module';
import { AirspaceModule } from './airspace/airspace.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    AdaptersModule,
    DronesModule,
    TelemetryModule,
    ControlModule,
    GeofencingModule,
    AlertsModule,
    MissionsModule,
    FlightLogsModule,
    ConnectionsModule,
    FleetModule,
    FpvMediaModule,
    ChecklistModule,
    MaintenanceModule,
    WeatherModule,
    AirspaceModule,
    ExportModule,
  ],
})
export class AppModule {}

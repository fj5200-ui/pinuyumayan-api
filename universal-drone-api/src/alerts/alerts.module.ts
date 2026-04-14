import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { GeofencingModule } from '../geofencing/geofencing.module';
import { AdaptersModule } from '../adapters/adapters.module';

@Module({
  imports: [TelemetryModule, GeofencingModule, AdaptersModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

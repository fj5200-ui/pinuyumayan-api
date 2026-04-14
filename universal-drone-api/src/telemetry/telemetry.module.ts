import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { TelemetryGateway } from './telemetry.gateway';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [AuthModule, AdaptersModule],
  providers: [TelemetryGateway, TelemetryService],
  exports: [TelemetryGateway, TelemetryService],
})
export class TelemetryModule {}

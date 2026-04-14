import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { DronesModule } from '../drones/drones.module';

@Module({
  imports: [TelemetryModule, AdaptersModule, DronesModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}

import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { GeofencingModule } from '../geofencing/geofencing.module';
import { AdaptersModule } from '../adapters/adapters.module';

@Module({
  imports: [GeofencingModule, AdaptersModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

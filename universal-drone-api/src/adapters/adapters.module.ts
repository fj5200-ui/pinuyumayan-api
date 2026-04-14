import { Module } from '@nestjs/common';
import { DroneAdapterRegistry } from './drone-adapter.registry';

@Module({
  providers: [DroneAdapterRegistry],
  exports: [DroneAdapterRegistry],
})
export class AdaptersModule {}

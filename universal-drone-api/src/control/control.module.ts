import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { ControlGateway } from './control.gateway';

@Module({
  imports: [AuthModule, AdaptersModule],
  providers: [ControlGateway],
  exports: [ControlGateway],
})
export class ControlModule {}

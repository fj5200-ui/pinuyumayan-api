import { Module } from '@nestjs/common';
import { FpvMediaController } from './fpv-media.controller';
import { FpvMediaService } from './fpv-media.service';

@Module({
  controllers: [FpvMediaController],
  providers: [FpvMediaService],
  exports: [FpvMediaService],
})
export class FpvMediaModule {}

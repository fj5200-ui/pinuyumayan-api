import { Module } from '@nestjs/common';
import { TribesController } from './tribes.controller';
import { TribesService } from './tribes.service';

@Module({
  controllers: [TribesController],
  providers: [TribesService],
})
export class TribesModule {}

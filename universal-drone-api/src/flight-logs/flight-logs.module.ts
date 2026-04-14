import { Module } from '@nestjs/common';
import { FlightLogsController } from './flight-logs.controller';
import { FlightLogsService } from './flight-logs.service';

@Module({
  controllers: [FlightLogsController],
  providers: [FlightLogsService],
  exports: [FlightLogsService],
})
export class FlightLogsModule {}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, IsNumber, IsBoolean, MinLength } from 'class-validator';

export class CreateDroneDto {
  @ApiProperty({ example: 'DJI Mavic 3 Alpha' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['dji', 'autel', 'px4', 'ardupilot', 'custom'] })
  @IsEnum(['dji', 'autel', 'px4', 'ardupilot', 'custom'])
  brand: string;

  @ApiProperty({ example: 'Mavic 3 Pro' })
  @IsString()
  model: string;

  @ApiProperty({ example: 'DJI2024ABC001' })
  @IsString()
  @MinLength(3)
  serialNumber: string;

  @ApiPropertyOptional({ example: '01.00.06.00' })
  @IsOptional()
  @IsString()
  firmwareVer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxFlightTimeMins?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxRangeMeters?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxAltitudeMeters?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  weightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDroneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['idle', 'preflight', 'flying', 'returning', 'error', 'maintenance', 'offline'] })
  @IsOptional()
  @IsEnum(['idle', 'preflight', 'flying', 'returning', 'error', 'maintenance', 'offline'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firmwareVer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  homeLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  homeLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  homeAltitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

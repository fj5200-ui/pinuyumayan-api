import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsNumber } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@pinuyumayan.tw' })
  @IsEmail({}, { message: '請輸入有效的電子郵件' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: '密碼至少需要6個字元' })
  password: string;

  @ApiProperty({ example: '王小明' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tribeId?: number;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@pinuyumayan.tw' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tribeId?: number;
}

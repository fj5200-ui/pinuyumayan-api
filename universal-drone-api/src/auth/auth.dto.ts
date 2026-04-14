import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'operator@drone.com' })
  @IsEmail({}, { message: '請輸入有效的電子郵件' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: '密碼至少需要 6 個字元' })
  password: string;

  @ApiProperty({ example: '王大明' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ['admin', 'operator', 'observer'], default: 'observer' })
  @IsOptional()
  @IsEnum(['admin', 'operator', 'observer'])
  role?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'operator@drone.com' })
  @IsEmail({}, { message: '請輸入有效的電子郵件' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '王大明' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

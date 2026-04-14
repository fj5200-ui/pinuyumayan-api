import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as path from 'path';

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = postgres(url, { max: 1, ssl: { rejectUnauthorized: false } });
  const db = drizzle(client);
  try {
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder: path.join(__dirname, '..', 'drizzle', 'migrations') });
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule);

  // 全域 API 前綴
  app.setGlobalPrefix('api');

  // CORS
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',').map(o => o.trim());
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  // 全域驗證管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));

  // WebSocket 適配器
  app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger 文件
  const config = new DocumentBuilder()
    .setTitle('Universal Drone API')
    .setDescription('通用無人機操作平台 — RESTful API\n\n支援品牌：DJI / Autel / PX4 / ArduPilot / 自組機')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '3000');
  await app.listen(port, '0.0.0.0');

  console.log(`\n🚁 Universal Drone API 啟動成功`);
  console.log(`   伺服器：http://localhost:${port}`);
  console.log(`   API 文件：http://localhost:${port}/api/docs`);
  console.log(`   WebSocket 遙測：ws://localhost:${port}/telemetry`);
  console.log(`   WebSocket 控制：ws://localhost:${port}/control\n`);
}
bootstrap();

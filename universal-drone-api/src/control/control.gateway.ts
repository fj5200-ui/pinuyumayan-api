import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DroneAdapterRegistry } from '../adapters/drone-adapter.registry';
import type { ControlCommand } from '../adapters/drone-adapter.interface';

@WebSocketGateway({
  namespace: '/control',
  cors: { origin: '*', credentials: false },
})
export class ControlGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ControlGateway.name);
  /** 每機上次 rc_input 時間（速率限制） */
  private lastRcInput = new Map<number, number>();
  private readonly RC_THROTTLE_MS = 50;

  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    private readonly registry: DroneAdapterRegistry,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token
        || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) throw new WsException('缺少認證 Token');

      const payload = this.jwt.verify(token) as { id: number; role: string };
      client.data.userId = payload.id;
      client.data.role   = payload.role;

      // 只有 operator 和 admin 可以使用控制 Gateway
      if (!['operator', 'admin'].includes(payload.role)) {
        client.emit('error', { message: '需要操作員或管理員權限' });
        client.disconnect();
        return;
      }
      this.logger.log(`控制 WS 連線：userId=${payload.id} role=${payload.role}`);
    } catch {
      client.disconnect();
    }
  }

  // ── 搖桿輸入 ─────────────────────────────────────────────
  @SubscribeMessage('rc_input')
  async handleRcInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { droneId: number; roll: number; pitch: number; yaw: number; throttle: number },
  ) {
    const now = Date.now();
    const last = this.lastRcInput.get(data.droneId) || 0;
    if (now - last < this.RC_THROTTLE_MS) return; // 速率限制
    this.lastRcInput.set(data.droneId, now);

    await this.dispatchCommand(data.droneId, {
      type: 'rc_input',
      payload: { roll: data.roll, pitch: data.pitch, yaw: data.yaw, throttle: data.throttle },
    });
  }

  // ── 雲台控制 ─────────────────────────────────────────────
  @SubscribeMessage('gimbal_control')
  async handleGimbal(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { droneId: number; pitch: number; yaw: number; roll: number },
  ) {
    await this.dispatchCommand(data.droneId, {
      type: 'gimbal',
      payload: { pitch: data.pitch, yaw: data.yaw, roll: data.roll },
    });
  }

  // ── 相機指令 ─────────────────────────────────────────────
  @SubscribeMessage('camera_command')
  async handleCamera(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { droneId: number; action: 'photo' | 'video_start' | 'video_stop' },
  ) {
    await this.dispatchCommand(data.droneId, {
      type: 'camera',
      payload: { action: data.action },
    });
  }

  // ── 飛往指定位置 ─────────────────────────────────────────
  @SubscribeMessage('goto')
  async handleGoto(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { droneId: number; lat: number; lon: number; altM: number },
  ) {
    await this.dispatchCommand(data.droneId, {
      type: 'goto',
      payload: { lat: data.lat, lon: data.lon, altM: data.altM },
    });
  }

  // ── 快速指令（起飛/降落/返航/懸停/上鎖/解鎖） ────────────
  @SubscribeMessage('command')
  async handleCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { droneId: number; action: string },
  ) {
    // 緊急停止需特別記錄
    if (data.action === 'emergency_stop') {
      this.logger.warn(`緊急停止！droneId=${data.droneId} userId=${client.data.userId}`);
    }

    await this.dispatchCommand(data.droneId, {
      type: data.action as any,
      payload: {},
    });
  }

  private async dispatchCommand(droneId: number, cmd: ControlCommand) {
    try {
      const adapter = this.registry.tryGet(droneId);
      if (!adapter) {
        this.logger.warn(`無人機 #${droneId} 無可用適配器`);
        return;
      }
      if (!adapter.isConnected()) {
        this.logger.warn(`無人機 #${droneId} 未連線`);
        return;
      }
      await adapter.sendCommand(cmd);
    } catch (err: any) {
      this.logger.error(`指令發送失敗：${err.message}`);
    }
  }
}

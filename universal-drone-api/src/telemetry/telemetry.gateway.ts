import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TelemetryFrame } from '../adapters/drone-adapter.interface';

export interface AlertPayload {
  droneId:   number;
  type:      string;
  severity:  string;
  message:   string;
  triggeredAt: string;
}

@WebSocketGateway({
  namespace: '/telemetry',
  cors: { origin: '*', credentials: false },
})
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TelemetryGateway.name);

  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token
        || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new WsException('缺少認證 Token');

      const payload = this.jwt.verify(token) as { id: number; role: string };
      client.data.userId = payload.id;
      client.data.role   = payload.role;

      this.logger.log(`WebSocket 連線：userId=${payload.id} role=${payload.role}`);
    } catch {
      this.logger.warn(`WebSocket 未授權連線已拒絕：${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebSocket 斷線：${client.id}`);
  }

  // ── 訂閱單機遙測 ─────────────────────────────────────────
  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { droneId: number }) {
    client.join(`drone:${data.droneId}`);
    client.emit('subscribed', { droneId: data.droneId });
    this.logger.debug(`${client.id} 訂閱無人機 #${data.droneId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { droneId: number }) {
    client.leave(`drone:${data.droneId}`);
    client.emit('unsubscribed', { droneId: data.droneId });
  }

  // ── 訂閱編隊（多機） ─────────────────────────────────────
  @SubscribeMessage('subscribe_fleet')
  handleFleetSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: number }) {
    client.join(`fleet:${data.groupId}`);
    client.emit('fleet_subscribed', { groupId: data.groupId });
  }

  @SubscribeMessage('unsubscribe_fleet')
  handleFleetUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: number }) {
    client.leave(`fleet:${data.groupId}`);
  }

  // ── 廣播方法（由 TelemetryService 呼叫） ─────────────────
  broadcastTelemetry(droneId: number, frame: TelemetryFrame) {
    this.server.to(`drone:${droneId}`).emit('telemetry', frame);
  }

  broadcastAlert(droneId: number, alert: AlertPayload) {
    this.server.to(`drone:${droneId}`).emit('alert', alert);
  }

  broadcastFleetTelemetry(groupId: number, payload: { droneId: number; frame: TelemetryFrame }) {
    this.server.to(`fleet:${groupId}`).emit('fleet_telemetry', payload);
  }

  broadcastDroneStatus(droneId: number, status: string) {
    this.server.to(`drone:${droneId}`).emit('status_change', { droneId, status });
  }
}

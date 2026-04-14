import { Logger } from '@nestjs/common';
import {
  DroneAdapter,
  DroneConnection,
  TelemetryFrame,
  ControlCommand,
  MissionUploadPayload,
} from '../drone-adapter.interface';

/**
 * DJI 適配器（WebSocket 橋接模式）
 * DJI Mobile SDK 在控制器平板上執行，本適配器透過 WebSocket
 * 連接運行於平板的「DJI Bridge App」，橋接 SDK 控制指令與遙測資料
 *
 * DJI Bridge App 通訊協定（自定義）：
 *   → 發送：{ type: 'command', action: '...', params: {} }
 *   ← 接收：{ type: 'telemetry', data: TelemetryFrame }
 */
export class DjiAdapter extends DroneAdapter {
  readonly brand = 'dji';
  private readonly logger = new Logger(DjiAdapter.name);
  private connected = false;
  private droneId: number;
  private telemetryCallback?: (frame: TelemetryFrame) => void;
  private ws?: any;   // WebSocket client（使用 ws 套件）
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(droneId: number) {
    super();
    this.droneId = droneId;
  }

  async connect(connection: DroneConnection): Promise<void> {
    this.logger.log(`DJI Bridge 連線中：${connection.endpoint}`);

    // 實際部署時：
    // const WebSocket = require('ws');
    // this.ws = new WebSocket(connection.endpoint);
    // this.ws.on('message', (raw: string) => {
    //   const msg = JSON.parse(raw);
    //   if (msg.type === 'telemetry') {
    //     this.telemetryCallback?.({ ...msg.data, droneId: this.droneId });
    //   }
    // });
    // await new Promise((resolve, reject) => {
    //   this.ws.once('open', resolve);
    //   this.ws.once('error', reject);
    // });

    this.connected = true;

    // 模擬心跳（開發用）
    this.heartbeatInterval = setInterval(() => {
      if (this.telemetryCallback) {
        this.telemetryCallback({
          droneId: this.droneId,
          timestamp: new Date(),
          latitude: 25.0330,
          longitude: 121.5654,
          altitudeMeters: 60,
          gpsFixType: 3,
          gpsSatellites: 16,
          roll: 0,
          pitch: 0,
          yaw: 0,
          speedMps: 0,
          verticalSpeedMps: 0,
          batteryPercent: 92,
          batteryVoltage: 23.1,
          batteryCurrentA: 5.0,
          rssi: -55,
          linkQuality: 100,
          flightMode: 'P-GPS',   // DJI 飛行模式
          isArmed: false,
        });
      }
    }, 200);

    this.logger.log(`DJI #${this.droneId} 連線成功`);
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.ws?.close();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onTelemetry(callback: (frame: TelemetryFrame) => void): void {
    this.telemetryCallback = callback;
  }

  private sendToBridge(message: object): void {
    if (this.ws?.readyState === 1 /* OPEN */) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async sendCommand(cmd: ControlCommand): Promise<void> {
    this.logger.debug(`DJI #${this.droneId} 指令：${cmd.type}`);
    this.sendToBridge({ type: 'command', action: cmd.type, params: cmd.payload });
  }

  async uploadMission(payload: MissionUploadPayload): Promise<void> {
    this.logger.log(`DJI #${this.droneId} 上傳任務（${payload.waypoints.length} 個航點）`);
    this.sendToBridge({ type: 'mission_upload', payload });
  }

  async startMission(): Promise<void> {
    this.sendToBridge({ type: 'command', action: 'startMission', params: {} });
  }

  async pauseMission(): Promise<void> {
    this.sendToBridge({ type: 'command', action: 'pauseMission', params: {} });
  }

  async resumeMission(): Promise<void> {
    this.sendToBridge({ type: 'command', action: 'resumeMission', params: {} });
  }

  async abortMission(): Promise<void> {
    this.sendToBridge({ type: 'command', action: 'goHome', params: {} });
  }

  getRtspUrl(): string | null {
    // DJI Mini SDK 可透過 VideoFeeder 提供 RTSP URL
    return null;
  }

  async capturePhoto(): Promise<string> {
    this.sendToBridge({ type: 'command', action: 'capturePhoto', params: {} });
    return `dji_${this.droneId}_${Date.now()}.jpg`;
  }

  async startVideoRecord(): Promise<void> {
    this.sendToBridge({ type: 'command', action: 'startRecord', params: {} });
  }

  async stopVideoRecord(): Promise<string> {
    this.sendToBridge({ type: 'command', action: 'stopRecord', params: {} });
    return `dji_${this.droneId}_${Date.now()}.mp4`;
  }
}

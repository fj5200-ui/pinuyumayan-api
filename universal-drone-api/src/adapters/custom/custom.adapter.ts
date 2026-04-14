import { Logger } from '@nestjs/common';
import {
  DroneAdapter,
  DroneConnection,
  TelemetryFrame,
  ControlCommand,
  MissionUploadPayload,
} from '../drone-adapter.interface';

/**
 * 自組機 / 通用適配器
 * 可作為新品牌開發的起點，或用於自組飛控
 */
export class CustomAdapter extends DroneAdapter {
  readonly brand = 'custom';
  private readonly logger = new Logger(CustomAdapter.name);
  private connected = false;
  private droneId: number;
  private telemetryCallback?: (frame: TelemetryFrame) => void;

  constructor(droneId: number) {
    super();
    this.droneId = droneId;
  }

  async connect(connection: DroneConnection): Promise<void> {
    this.logger.log(`Custom 適配器連線：${connection.endpoint}`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onTelemetry(callback: (frame: TelemetryFrame) => void): void {
    this.telemetryCallback = callback;
  }

  async sendCommand(cmd: ControlCommand): Promise<void> {
    this.logger.debug(`Custom #${this.droneId} 指令：${cmd.type}`);
  }

  async uploadMission(payload: MissionUploadPayload): Promise<void> {
    this.logger.log(`Custom #${this.droneId} 上傳任務`);
  }

  async startMission(): Promise<void> {}
  async pauseMission(): Promise<void> {}
  async resumeMission(): Promise<void> {}
  async abortMission(): Promise<void> {}

  getRtspUrl(): string | null {
    return null;
  }

  async capturePhoto(): Promise<string> {
    return `custom_${this.droneId}_${Date.now()}.jpg`;
  }

  async startVideoRecord(): Promise<void> {}

  async stopVideoRecord(): Promise<string> {
    return `custom_${this.droneId}_${Date.now()}.mp4`;
  }
}

import { Logger } from '@nestjs/common';
import {
  DroneAdapter,
  DroneConnection,
  TelemetryFrame,
  ControlCommand,
  MissionUploadPayload,
} from '../drone-adapter.interface';

/**
 * ArduPilot 適配器（MAVLink 協定）
 * 支援 ArduCopter / ArduPlane / ArduRover
 * 飛行模式與 PX4 不同（STABILIZE / LOITER / AUTO / GUIDED / RTL / LAND）
 */
export class ArduPilotAdapter extends DroneAdapter {
  readonly brand = 'ardupilot';
  private readonly logger = new Logger(ArduPilotAdapter.name);
  private connected = false;
  private droneId: number;
  private telemetryCallback?: (frame: TelemetryFrame) => void;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(droneId: number) {
    super();
    this.droneId = droneId;
  }

  async connect(connection: DroneConnection): Promise<void> {
    this.logger.log(`ArduPilot 連線中：${connection.endpoint}`);
    this.connected = true;

    // 模擬心跳（與 PX4 相同格式，僅飛行模式字串不同）
    this.heartbeatInterval = setInterval(() => {
      if (this.telemetryCallback) {
        this.telemetryCallback({
          droneId: this.droneId,
          timestamp: new Date(),
          latitude: 25.0330 + (Math.random() - 0.5) * 0.001,
          longitude: 121.5654 + (Math.random() - 0.5) * 0.001,
          altitudeMeters: 30 + Math.random() * 5,
          gpsFixType: 3,
          gpsSatellites: 14,
          roll: (Math.random() - 0.5) * 0.08,
          pitch: (Math.random() - 0.5) * 0.08,
          yaw: Math.random() * Math.PI * 2,
          speedMps: 4 + Math.random(),
          verticalSpeedMps: 0,
          batteryPercent: 78,
          batteryVoltage: 22.4,
          batteryCurrentA: 7.2,
          rssi: -70,
          linkQuality: 90,
          flightMode: 'LOITER',   // ArduCopter 飛行模式
          isArmed: true,
        });
      }
    }, 200);

    this.logger.log(`ArduPilot #${this.droneId} 連線成功`);
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onTelemetry(callback: (frame: TelemetryFrame) => void): void {
    this.telemetryCallback = callback;
  }

  async sendCommand(cmd: ControlCommand): Promise<void> {
    this.logger.debug(`ArduPilot #${this.droneId} 指令：${cmd.type}`);
    // ArduPilot 特定模式切換範例：
    // takeoff  → SET_MODE (GUIDED) → MAV_CMD_NAV_TAKEOFF
    // return_home → SET_MODE (RTL)
    // land    → SET_MODE (LAND)
  }

  async uploadMission(payload: MissionUploadPayload): Promise<void> {
    this.logger.log(`ArduPilot #${this.droneId} 上傳 ${payload.waypoints.length} 個航點`);
  }

  async startMission(): Promise<void> {
    // SET_MODE (AUTO)
  }

  async pauseMission(): Promise<void> {
    // SET_MODE (LOITER)
  }

  async resumeMission(): Promise<void> {
    // SET_MODE (AUTO) + COMMAND_LONG (MAV_CMD_DO_SET_MISSION_CURRENT)
  }

  async abortMission(): Promise<void> {
    // SET_MODE (RTL)
  }

  getRtspUrl(): string | null {
    return null;
  }

  async capturePhoto(): Promise<string> {
    return `ardupilot_${this.droneId}_${Date.now()}.jpg`;
  }

  async startVideoRecord(): Promise<void> {}

  async stopVideoRecord(): Promise<string> {
    return `ardupilot_${this.droneId}_${Date.now()}.mp4`;
  }
}

import { Logger } from '@nestjs/common';
import {
  DroneAdapter,
  DroneConnection,
  TelemetryFrame,
  ControlCommand,
  MissionUploadPayload,
} from '../drone-adapter.interface';

/**
 * PX4 適配器（MAVLink 協定）
 * 透過 UDP 或序列埠連接 PX4 飛控
 * 使用 MAVLink 訊息：GLOBAL_POSITION_INT, ATTITUDE, SYS_STATUS, GPS_RAW_INT
 */
export class Px4Adapter extends DroneAdapter {
  readonly brand = 'px4';
  private readonly logger = new Logger(Px4Adapter.name);
  private connected = false;
  private droneId: number;
  private telemetryCallback?: (frame: TelemetryFrame) => void;
  private connection?: DroneConnection;
  private heartbeatInterval?: NodeJS.Timeout;
  private latestFrame: Partial<TelemetryFrame> = {};

  constructor(droneId: number) {
    super();
    this.droneId = droneId;
  }

  async connect(connection: DroneConnection): Promise<void> {
    this.connection = connection;
    this.logger.log(`PX4 連線中：${connection.endpoint}`);

    // 實際部署時使用 node-mavlink 建立 UDP/serial 連線
    // 訂閱以下 MAVLink 訊息 ID：
    //   HEARTBEAT (0), GLOBAL_POSITION_INT (33), ATTITUDE (30),
    //   SYS_STATUS (1), GPS_RAW_INT (24), RC_CHANNELS (65)
    //
    // 範例（需安裝 node-mavlink）：
    // const { createConnection } = require('node-mavlink');
    // const reader = await createConnection({ type: 'udpin', port: 14550 });
    // reader.on('data', (packet) => this.handleMavlinkPacket(packet));

    this.connected = true;

    // 模擬心跳（開發用）
    this.heartbeatInterval = setInterval(() => {
      if (this.telemetryCallback) {
        this.telemetryCallback({
          droneId: this.droneId,
          timestamp: new Date(),
          latitude: 25.0330 + (Math.random() - 0.5) * 0.001,
          longitude: 121.5654 + (Math.random() - 0.5) * 0.001,
          altitudeMeters: 50 + Math.random() * 5,
          gpsFixType: 3,
          gpsSatellites: 12 + Math.floor(Math.random() * 4),
          roll: (Math.random() - 0.5) * 0.1,
          pitch: (Math.random() - 0.5) * 0.1,
          yaw: Math.random() * Math.PI * 2,
          speedMps: 5 + Math.random() * 2,
          verticalSpeedMps: (Math.random() - 0.5) * 0.5,
          batteryPercent: 85 - Math.floor(Math.random() * 2),
          batteryVoltage: 22.2,
          batteryCurrentA: 8.5,
          rssi: -65 - Math.floor(Math.random() * 10),
          linkQuality: 95,
          flightMode: 'AUTO',
          isArmed: true,
        });
      }
    }, 200);

    this.logger.log(`PX4 #${this.droneId} 連線成功`);
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.connected = false;
    this.logger.log(`PX4 #${this.droneId} 已斷線`);
  }

  isConnected(): boolean {
    return this.connected;
  }

  onTelemetry(callback: (frame: TelemetryFrame) => void): void {
    this.telemetryCallback = callback;
  }

  async sendCommand(cmd: ControlCommand): Promise<void> {
    this.logger.debug(`PX4 #${this.droneId} 指令：${cmd.type}`, cmd.payload);
    // 根據 cmd.type 發送對應 MAVLink 訊息：
    // - rc_input     → COMMAND_LONG (MAV_CMD_DO_SET_MODE) + RC_CHANNELS_OVERRIDE
    // - takeoff      → COMMAND_LONG (MAV_CMD_NAV_TAKEOFF)
    // - land         → COMMAND_LONG (MAV_CMD_NAV_LAND)
    // - return_home  → COMMAND_LONG (MAV_CMD_NAV_RETURN_TO_LAUNCH)
    // - arm          → COMMAND_LONG (MAV_CMD_COMPONENT_ARM_DISARM, 1)
    // - disarm       → COMMAND_LONG (MAV_CMD_COMPONENT_ARM_DISARM, 0)
    // - goto         → SET_POSITION_TARGET_GLOBAL_INT
    // - gimbal       → COMMAND_LONG (MAV_CMD_DO_MOUNT_CONTROL)
  }

  async uploadMission(payload: MissionUploadPayload): Promise<void> {
    this.logger.log(`PX4 #${this.droneId} 上傳任務（${payload.waypoints.length} 個航點）`);
    // MAVLink 任務上傳協定：
    // 1. 發送 MISSION_COUNT
    // 2. 等待 MISSION_REQUEST_INT（逐點）
    // 3. 發送 MISSION_ITEM_INT（每個航點）
    // 4. 等待 MISSION_ACK
  }

  async startMission(): Promise<void> {
    this.logger.log(`PX4 #${this.droneId} 開始任務`);
    // COMMAND_LONG (MAV_CMD_MISSION_START)
  }

  async pauseMission(): Promise<void> {
    // COMMAND_LONG (MAV_CMD_DO_PAUSE_CONTINUE, 0)
  }

  async resumeMission(): Promise<void> {
    // COMMAND_LONG (MAV_CMD_DO_PAUSE_CONTINUE, 1)
  }

  async abortMission(): Promise<void> {
    this.logger.warn(`PX4 #${this.droneId} 中止任務`);
    // COMMAND_LONG (MAV_CMD_OVERRIDE_GOTO, MAV_GOTO_DO_HOLD)
    // 然後執行返航
  }

  getRtspUrl(): string | null {
    // PX4 搭配 companion computer 提供的 RTSP URL
    return this.connection ? `rtsp://${this.connection.endpoint.split(':')[1]?.replace('//', '')}:8554/live` : null;
  }

  async capturePhoto(): Promise<string> {
    // MAV_CMD_IMAGE_START_CAPTURE
    const filename = `px4_${this.droneId}_${Date.now()}.jpg`;
    return filename;
  }

  async startVideoRecord(): Promise<void> {
    // MAV_CMD_VIDEO_START_CAPTURE
  }

  async stopVideoRecord(): Promise<string> {
    // MAV_CMD_VIDEO_STOP_CAPTURE
    return `px4_${this.droneId}_${Date.now()}.mp4`;
  }
}

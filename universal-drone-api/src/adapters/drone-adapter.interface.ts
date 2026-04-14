// ─────────────────────────────────────────────────────────────────────────────
//  通用無人機適配器介面
//  所有品牌適配器（DJI / PX4 / ArduPilot / 自組機）必須實作此抽象類別
// ─────────────────────────────────────────────────────────────────────────────

export interface DroneConnection {
  /** 連線類型 */
  type: 'usb' | 'wifi' | 'cellular' | 'mavlink_udp' | 'mavlink_serial' | 'vendor_sdk';
  /** 連線端點：例如 '/dev/ttyUSB0', 'udp:192.168.1.1:14550', 'ws://bridge:8080' */
  endpoint: string;
  /** 額外選項（鮑率、頻道等） */
  options?: Record<string, unknown>;
}

export interface TelemetryFrame {
  droneId:          number;
  timestamp:        Date;
  // GPS
  latitude:         number;
  longitude:        number;
  altitudeMeters:   number;
  gpsFixType:       number;   // 0=無, 2=2D, 3=3D
  gpsSatellites:    number;
  // 姿態（弧度）
  roll:             number;
  pitch:            number;
  yaw:              number;
  // 速度
  speedMps:         number;
  verticalSpeedMps: number;
  // 電池
  batteryPercent:   number;
  batteryVoltage:   number;
  batteryCurrentA:  number;
  // 訊號
  rssi:             number;
  linkQuality:      number;
  // 飛行狀態
  flightMode:       string;
  isArmed:          boolean;
}

export type ControlCommandType =
  | 'rc_input'
  | 'gimbal'
  | 'camera'
  | 'goto'
  | 'takeoff'
  | 'land'
  | 'return_home'
  | 'arm'
  | 'disarm'
  | 'hover';

export interface ControlCommand {
  type: ControlCommandType;
  payload: Record<string, unknown>;
}

export interface MissionWaypoint {
  sequence:       number;
  latitude:       number;
  longitude:      number;
  altitudeMeters: number;
  speedMps?:      number;
  hoverSeconds?:  number;
  action?:        string;
  gimbalPitch?:   number;
}

export interface MissionUploadPayload {
  waypoints:      MissionWaypoint[];
  returnHomeAltM: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  抽象適配器基底類別
// ─────────────────────────────────────────────────────────────────────────────
export abstract class DroneAdapter {
  abstract readonly brand: string;

  // ── 生命週期 ──────────────────────────────────────────────
  abstract connect(connection: DroneConnection): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;

  // ── 遙測 ─────────────────────────────────────────────────
  /** 適配器呼叫此回呼以推送每幀遙測資料 */
  abstract onTelemetry(callback: (frame: TelemetryFrame) => void): void;

  // ── 控制 ─────────────────────────────────────────────────
  abstract sendCommand(cmd: ControlCommand): Promise<void>;
  abstract uploadMission(payload: MissionUploadPayload): Promise<void>;
  abstract startMission(): Promise<void>;
  abstract pauseMission(): Promise<void>;
  abstract resumeMission(): Promise<void>;
  abstract abortMission(): Promise<void>;

  // ── 相機 / FPV ────────────────────────────────────────────
  abstract getRtspUrl(): string | null;
  abstract capturePhoto(): Promise<string>;        // 回傳檔名
  abstract startVideoRecord(): Promise<void>;
  abstract stopVideoRecord(): Promise<string>;     // 回傳檔名
}

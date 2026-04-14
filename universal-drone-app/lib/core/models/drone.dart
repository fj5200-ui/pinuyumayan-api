import 'package:freezed_annotation/freezed_annotation.dart';

part 'drone.freezed.dart';
part 'drone.g.dart';

enum DroneStatus { idle, preflight, flying, returning, error, maintenance, offline }
enum DroneBrand { dji, autel, px4, ardupilot, custom }

@freezed
class Drone with _$Drone {
  const factory Drone({
    required int id,
    required String name,
    required DroneBrand brand,
    required String model,
    required String serialNumber,
    String? firmwareVer,
    @Default(DroneStatus.offline) DroneStatus status,
    int? maxFlightTimeMins,
    int? maxRangeMeters,
    int? maxAltitudeMeters,
    int? weightGrams,
    double? homeLatitude,
    double? homeLongitude,
    double? homeAltitude,
    String? notes,
    @Default(true) bool isActive,
    LiveTelemetry? live,
  }) = _Drone;

  factory Drone.fromJson(Map<String, dynamic> json) => _$DroneFromJson(json);
}

@freezed
class LiveTelemetry with _$LiveTelemetry {
  const factory LiveTelemetry({
    double? latitude,
    double? longitude,
    double? altitudeMeters,
    int? batteryPercent,
    double? speedMps,
    String? flightMode,
    @Default(false) bool isArmed,
    int? gpsSatellites,
    int? rssi,
    String? updatedAt,
  }) = _LiveTelemetry;

  factory LiveTelemetry.fromJson(Map<String, dynamic> json) =>
      _$LiveTelemetryFromJson(json);
}

@freezed
class TelemetryFrame with _$TelemetryFrame {
  const factory TelemetryFrame({
    required int droneId,
    required String timestamp,
    @Default(0) double latitude,
    @Default(0) double longitude,
    @Default(0) double altitudeMeters,
    @Default(0) int gpsFixType,
    @Default(0) int gpsSatellites,
    @Default(0) double roll,
    @Default(0) double pitch,
    @Default(0) double yaw,
    @Default(0) double speedMps,
    @Default(0) double verticalSpeedMps,
    @Default(0) int batteryPercent,
    @Default(0) double batteryVoltage,
    @Default(0) double batteryCurrentA,
    @Default(0) int rssi,
    @Default(0) int linkQuality,
    @Default('') String flightMode,
    @Default(false) bool isArmed,
  }) = _TelemetryFrame;

  factory TelemetryFrame.fromJson(Map<String, dynamic> json) =>
      _$TelemetryFrameFromJson(json);
}

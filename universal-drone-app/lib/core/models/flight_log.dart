import 'package:freezed_annotation/freezed_annotation.dart';

part 'flight_log.freezed.dart';
part 'flight_log.g.dart';

enum LogEventType {
  takeoff,
  land,
  waypointReached,
  modeChange,
  alert,
  commandSent,
  connectionLost,
  connectionRestored,
  geofenceBreach,
  batteryLow,
}

@freezed
class FlightLogEvent with _$FlightLogEvent {
  const factory FlightLogEvent({
    required int id,
    required int flightLogId,
    required LogEventType eventType,
    required String timestamp,
    String? message,
    Map<String, dynamic>? metadata,
  }) = _FlightLogEvent;

  factory FlightLogEvent.fromJson(Map<String, dynamic> json) =>
      _$FlightLogEventFromJson(json);
}

@freezed
class FlightLog with _$FlightLog {
  const factory FlightLog({
    required int id,
    required int droneId,
    int? missionId,
    required String startedAt,
    String? endedAt,
    int? durationSeconds,
    double? maxAltitudeMeters,
    double? maxSpeedMps,
    double? distanceKm,
    int? minBatteryPercent,
    Map<String, dynamic>? trajectoryGeoJson,
    @Default([]) List<FlightLogEvent> events,
  }) = _FlightLog;

  factory FlightLog.fromJson(Map<String, dynamic> json) =>
      _$FlightLogFromJson(json);
}

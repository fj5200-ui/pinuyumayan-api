import 'package:freezed_annotation/freezed_annotation.dart';

part 'mission.freezed.dart';
part 'mission.g.dart';

enum MissionStatus { draft, ready, inProgress, completed, aborted, failed }
enum WaypointAction { none, takePhoto, startRecord, stopRecord, hover, rtl }

@freezed
class Waypoint with _$Waypoint {
  const factory Waypoint({
    required int id,
    required int missionId,
    required int sequence,
    required double latitude,
    required double longitude,
    required double altitudeMeters,
    @Default(WaypointAction.none) WaypointAction action,
    double? hoverSeconds,
    double? speedMps,
    String? notes,
  }) = _Waypoint;

  factory Waypoint.fromJson(Map<String, dynamic> json) =>
      _$WaypointFromJson(json);
}

@freezed
class Mission with _$Mission {
  const factory Mission({
    required int id,
    required int droneId,
    required String name,
    @Default(MissionStatus.draft) MissionStatus status,
    double? targetLatitude,
    double? targetLongitude,
    String? targetGeoJson,
    double? maxAltitudeMeters,
    double? maxSpeedMps,
    bool? returnHomeAfter,
    String? startedAt,
    String? completedAt,
    String? notes,
    String? createdAt,
    @Default([]) List<Waypoint> waypoints,
  }) = _Mission;

  factory Mission.fromJson(Map<String, dynamic> json) =>
      _$MissionFromJson(json);
}

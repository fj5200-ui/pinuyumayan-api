import 'package:freezed_annotation/freezed_annotation.dart';

part 'weather.freezed.dart';
part 'weather.g.dart';

@freezed
class WeatherData with _$WeatherData {
  const factory WeatherData({
    required double latitude,
    required double longitude,
    required double temperatureCelsius,
    required double windSpeedMps,
    required double windDegrees,
    required double visibilityMeters,
    required double precipitationMm,
    required int cloudPercent,
    required int riskScore,
    String? description,
    String? cachedAt,
  }) = _WeatherData;

  factory WeatherData.fromJson(Map<String, dynamic> json) =>
      _$WeatherDataFromJson(json);
}

@freezed
class AirspaceZone with _$AirspaceZone {
  const factory AirspaceZone({
    required String id,
    required String name,
    required String type,
    String? upperLimitMeters,
    String? lowerLimitMeters,
    String? geometry,
  }) = _AirspaceZone;

  factory AirspaceZone.fromJson(Map<String, dynamic> json) =>
      _$AirspaceZoneFromJson(json);
}

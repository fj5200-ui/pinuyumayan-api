import 'package:freezed_annotation/freezed_annotation.dart';

part 'alert.freezed.dart';
part 'alert.g.dart';

enum AlertType {
  lowBattery,
  lostConnection,
  geofenceBreach,
  gpsAnomaly,
  motorError,
  highWind,
  custom,
}

enum AlertSeverity { critical, warning, info }

@freezed
class Alert with _$Alert {
  const factory Alert({
    required int id,
    required int droneId,
    required AlertType type,
    required AlertSeverity severity,
    required String message,
    @Default(false) bool resolved,
    String? resolvedAt,
    String? createdAt,
  }) = _Alert;

  factory Alert.fromJson(Map<String, dynamic> json) => _$AlertFromJson(json);
}

@freezed
class FailsafeRule with _$FailsafeRule {
  const factory FailsafeRule({
    required int id,
    required int droneId,
    required AlertType triggerType,
    required String action,
    int? batteryThreshold,
    int? rssiThreshold,
    @Default(true) bool isActive,
  }) = _FailsafeRule;

  factory FailsafeRule.fromJson(Map<String, dynamic> json) =>
      _$FailsafeRuleFromJson(json);
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/websocket_service.dart';
import '../models/drone.dart';

// Selected drone ID
final selectedDroneIdProvider = StateProvider<int?>((ref) => null);

// Drone list
class DroneListNotifier extends StateNotifier<AsyncValue<List<Drone>>> {
  final ApiClient _api;

  DroneListNotifier(this._api) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final data = await _api.getDrones();
      state = AsyncValue.data(data.map((d) => Drone.fromJson(d)).toList());
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addDrone(Map<String, dynamic> data) async {
    final drone = Drone.fromJson(await _api.createDrone(data));
    state.whenData((list) {
      state = AsyncValue.data([...list, drone]);
    });
  }

  Future<void> deleteDrone(int id) async {
    await _api.deleteDrone(id);
    state.whenData((list) {
      state = AsyncValue.data(list.where((d) => d.id != id).toList());
    });
  }
}

final droneListProvider =
    StateNotifierProvider<DroneListNotifier, AsyncValue<List<Drone>>>((ref) {
  return DroneListNotifier(ref.read(apiClientProvider));
});

// Single drone (with live telemetry merged from WS)
final droneProvider = FutureProvider.family<Drone, int>((ref, droneId) async {
  final api = ref.read(apiClientProvider);
  final data = await api.getDrone(droneId);
  return Drone.fromJson(data);
});

// Live telemetry per drone (updated by WebSocket)
class TelemetryNotifier extends StateNotifier<Map<int, LiveTelemetry>> {
  final WebSocketService _ws;

  TelemetryNotifier(this._ws) : super({}) {
    _ws.telemetryStream.listen(_onTelemetry);
  }

  void _onTelemetry(Map<String, dynamic> data) {
    final droneId = data['droneId'] as int?;
    if (droneId == null) return;
    final telemetry = LiveTelemetry(
      latitude: (data['latitude'] as num?)?.toDouble(),
      longitude: (data['longitude'] as num?)?.toDouble(),
      altitudeMeters: (data['altitudeMeters'] as num?)?.toDouble(),
      batteryPercent: data['batteryPercent'] as int?,
      speedMps: (data['speedMps'] as num?)?.toDouble(),
      flightMode: data['flightMode'] as String?,
      isArmed: data['isArmed'] as bool? ?? false,
      gpsSatellites: data['gpsSatellites'] as int?,
      rssi: data['rssi'] as int?,
      updatedAt: data['timestamp'] as String?,
    );
    state = {...state, droneId: telemetry};
  }

  LiveTelemetry? getTelemetry(int droneId) => state[droneId];

  void subscribe(int droneId) => _ws.subscribeDrone(droneId);
  void unsubscribe(int droneId) => _ws.unsubscribeDrone(droneId);
}

final telemetryProvider =
    StateNotifierProvider<TelemetryNotifier, Map<int, LiveTelemetry>>((ref) {
  return TelemetryNotifier(ref.read(websocketServiceProvider));
});

final droneTelemetryProvider = Provider.family<LiveTelemetry?, int>((ref, droneId) {
  return ref.watch(telemetryProvider)[droneId];
});

// Drone status map (updated via WS drone_status events)
class DroneStatusNotifier extends StateNotifier<Map<int, DroneStatus>> {
  final WebSocketService _ws;

  DroneStatusNotifier(this._ws) : super({}) {
    _ws.droneStatusStream.listen(_onStatus);
  }

  void _onStatus(Map<String, dynamic> data) {
    final droneId = data['droneId'] as int?;
    final statusStr = data['status'] as String?;
    if (droneId == null || statusStr == null) return;
    final status = DroneStatus.values.firstWhere(
      (s) => s.name == statusStr,
      orElse: () => DroneStatus.offline,
    );
    state = {...state, droneId: status};
  }
}

final droneStatusProvider =
    StateNotifierProvider<DroneStatusNotifier, Map<int, DroneStatus>>((ref) {
  return DroneStatusNotifier(ref.read(websocketServiceProvider));
});

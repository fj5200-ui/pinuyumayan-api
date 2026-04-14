import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/websocket_service.dart';
import '../models/alert.dart';

class AlertsNotifier extends StateNotifier<List<Alert>> {
  final ApiClient _api;
  final WebSocketService _ws;

  AlertsNotifier(this._api, this._ws) : super([]) {
    _ws.alertStream.listen(_onAlert);
    load();
  }

  void _onAlert(Map<String, dynamic> data) {
    try {
      final alert = Alert.fromJson(data);
      state = [alert, ...state];
    } catch (_) {}
  }

  Future<void> load({int? droneId}) async {
    try {
      final data = await _api.getAlerts(droneId: droneId, unresolved: true);
      state = data.map((a) => Alert.fromJson(a)).toList();
    } catch (_) {}
  }

  Future<void> resolve(int id) async {
    await _api.resolveAlert(id);
    state = state.map((a) => a.id == id ? a.copyWith(resolved: true) : a).toList();
  }

  List<Alert> get unresolvedAlerts => state.where((a) => !a.resolved).toList();

  List<Alert> get criticalAlerts => state
      .where((a) => !a.resolved && a.severity == AlertSeverity.critical)
      .toList();
}

final alertsProvider =
    StateNotifierProvider<AlertsNotifier, List<Alert>>((ref) {
  return AlertsNotifier(
    ref.read(apiClientProvider),
    ref.read(websocketServiceProvider),
  );
});

final unresolvedAlertsCountProvider = Provider<int>((ref) {
  return ref.watch(alertsProvider).where((a) => !a.resolved).length;
});

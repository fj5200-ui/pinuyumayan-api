import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../api/api_client.dart' as api_helper;

enum WsConnectionState { disconnected, connecting, connected, reconnecting }

final websocketServiceProvider = Provider<WebSocketService>((ref) {
  return WebSocketService();
});

class WebSocketService {
  io.Socket? _telemetrySocket;
  io.Socket? _controlSocket;

  final _telemetryController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _alertController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _statusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController =
      StreamController<WsConnectionState>.broadcast();

  Stream<Map<String, dynamic>> get telemetryStream =>
      _telemetryController.stream;
  Stream<Map<String, dynamic>> get alertStream => _alertController.stream;
  Stream<Map<String, dynamic>> get droneStatusStream =>
      _statusController.stream;
  Stream<WsConnectionState> get connectionStateStream =>
      _connectionStateController.stream;

  bool _telemetryConnected = false;
  bool _controlConnected = false;

  bool get isConnected => _telemetryConnected;

  Future<void> connect() async {
    final serverUrl = await api_helper.getServerUrl();
    final token = await api_helper.getToken();
    if (token == null) return;

    _connectionStateController.add(WsConnectionState.connecting);

    _telemetrySocket = io.io(
      '$serverUrl/telemetry',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)
          .build(),
    );

    _telemetrySocket!.onConnect((_) {
      _telemetryConnected = true;
      _connectionStateController.add(WsConnectionState.connected);
    });

    _telemetrySocket!.onDisconnect((_) {
      _telemetryConnected = false;
      _connectionStateController.add(WsConnectionState.disconnected);
    });

    _telemetrySocket!.onReconnecting((_) {
      _connectionStateController.add(WsConnectionState.reconnecting);
    });

    _telemetrySocket!.on('telemetry', (data) {
      if (data is Map) {
        _telemetryController.add(Map<String, dynamic>.from(data));
      }
    });

    _telemetrySocket!.on('alert', (data) {
      if (data is Map) {
        _alertController.add(Map<String, dynamic>.from(data));
      }
    });

    _telemetrySocket!.on('drone_status', (data) {
      if (data is Map) {
        _statusController.add(Map<String, dynamic>.from(data));
      }
    });

    // Control socket
    _controlSocket = io.io(
      '$serverUrl/control',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .build(),
    );

    _controlSocket!.onConnect((_) {
      _controlConnected = true;
    });

    _controlSocket!.onDisconnect((_) {
      _controlConnected = false;
    });
  }

  void subscribeDrone(int droneId) {
    _telemetrySocket?.emit('subscribe', {'droneId': droneId});
  }

  void unsubscribeDrone(int droneId) {
    _telemetrySocket?.emit('unsubscribe', {'droneId': droneId});
  }

  void subscribeFleet(int groupId) {
    _telemetrySocket?.emit('subscribe_fleet', {'groupId': groupId});
  }

  void sendRcInput({
    required int droneId,
    required double roll,
    required double pitch,
    required double yaw,
    required double throttle,
  }) {
    if (!_controlConnected) return;
    _controlSocket?.emit('rc_input', {
      'droneId': droneId,
      'roll': roll,
      'pitch': pitch,
      'yaw': yaw,
      'throttle': throttle,
    });
  }

  void sendGimbalControl({
    required int droneId,
    required double pitch,
    double? yaw,
    double? roll,
  }) {
    if (!_controlConnected) return;
    _controlSocket?.emit('gimbal_control', {
      'droneId': droneId,
      'pitch': pitch,
      if (yaw != null) 'yaw': yaw,
      if (roll != null) 'roll': roll,
    });
  }

  void sendCameraCommand(int droneId, String command) {
    if (!_controlConnected) return;
    _controlSocket?.emit('camera_command', {
      'droneId': droneId,
      'command': command,
    });
  }

  void sendCommand(int droneId, String command) {
    if (!_controlConnected) return;
    _controlSocket?.emit('command', {
      'droneId': droneId,
      'command': command,
    });
  }

  void sendGoto({
    required int droneId,
    required double latitude,
    required double longitude,
    required double altitude,
  }) {
    if (!_controlConnected) return;
    _controlSocket?.emit('goto', {
      'droneId': droneId,
      'latitude': latitude,
      'longitude': longitude,
      'altitude': altitude,
    });
  }

  void disconnect() {
    _telemetrySocket?.disconnect();
    _controlSocket?.disconnect();
    _telemetrySocket?.dispose();
    _controlSocket?.dispose();
    _telemetrySocket = null;
    _controlSocket = null;
    _telemetryConnected = false;
    _controlConnected = false;
    _connectionStateController.add(WsConnectionState.disconnected);
  }

  void dispose() {
    disconnect();
    _telemetryController.close();
    _alertController.close();
    _statusController.close();
    _connectionStateController.close();
  }
}

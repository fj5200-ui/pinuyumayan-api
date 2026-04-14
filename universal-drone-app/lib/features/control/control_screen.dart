import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/drone_provider.dart';
import '../../core/api/websocket_service.dart';
import '../../core/api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/battery_indicator.dart';
import '../../widgets/signal_indicator.dart';
import '../../widgets/confirm_dialog.dart';

class ControlScreen extends ConsumerStatefulWidget {
  final int droneId;

  const ControlScreen({super.key, required this.droneId});

  @override
  ConsumerState<ControlScreen> createState() => _ControlScreenState();
}

class _ControlScreenState extends ConsumerState<ControlScreen> {
  Timer? _rcTimer;
  double _roll = 0, _pitch = 0, _yaw = 0, _throttle = 0;
  double _gimbalPitch = 0;
  bool _isRecording = false;
  int _latencyMs = 0;
  DateTime? _lastTelemetryAt;

  @override
  void initState() {
    super.initState();
    ref.read(telemetryProvider.notifier).subscribe(widget.droneId);
    // Send RC input at 20Hz when joystick active
    _rcTimer = Timer.periodic(const Duration(milliseconds: 50), (_) {
      _sendRc();
    });
    // Track latency
    ref.read(websocketServiceProvider).telemetryStream.listen((data) {
      if (data['droneId'] == widget.droneId) {
        final now = DateTime.now();
        if (_lastTelemetryAt != null) {
          setState(() {
            _latencyMs = now.difference(_lastTelemetryAt!).inMilliseconds;
          });
        }
        _lastTelemetryAt = now;
      }
    });
  }

  @override
  void dispose() {
    _rcTimer?.cancel();
    ref.read(telemetryProvider.notifier).unsubscribe(widget.droneId);
    super.dispose();
  }

  void _sendRc() {
    if (_roll == 0 && _pitch == 0 && _yaw == 0 && _throttle == 0) return;
    ref.read(websocketServiceProvider).sendRcInput(
          droneId: widget.droneId,
          roll: _roll,
          pitch: _pitch,
          yaw: _yaw,
          throttle: _throttle,
        );
  }

  Future<void> _sendCommand(String cmd) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.dio.post('/drones/${widget.droneId}/command',
          data: {'command': cmd});
    } catch (_) {
      ref
          .read(websocketServiceProvider)
          .sendCommand(widget.droneId, cmd);
    }
  }

  Future<void> _emergencyStop() async {
    await _sendCommand('emergency_stop');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final live = ref.watch(droneTelemetryProvider(widget.droneId));

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(l10n.control,
            style: const TextStyle(color: Colors.white)),
        actions: [
          // Latency indicator
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Center(
              child: Text(
                '$_latencyMs ms',
                style: TextStyle(
                  color: _latencyMs < 100
                      ? Colors.green
                      : _latencyMs < 300
                          ? Colors.orange
                          : Colors.red,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Telemetry HUD bar
            _TelemetryHud(live: live, l10n: l10n),
            const Divider(height: 1, color: Colors.grey),

            // Quick command buttons
            _CommandBar(
              l10n: l10n,
              onTakeoff: () => _sendCommand('takeoff'),
              onLand: () => _sendCommand('land'),
              onRth: () => _sendCommand('return_to_home'),
              onHover: () => _sendCommand('hover'),
            ),
            const Divider(height: 1, color: Colors.grey),

            // Main control area
            Expanded(
              child: Row(
                children: [
                  // Left joystick (Yaw + Throttle)
                  Expanded(
                    child: _JoystickPanel(
                      label: 'Yaw / Throttle',
                      onChanged: (x, y) {
                        _yaw = x;
                        _throttle = y;
                      },
                    ),
                  ),

                  // Center: gimbal + camera controls + emergency stop
                  SizedBox(
                    width: 160,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(l10n.gimbal,
                            style: const TextStyle(
                                color: Colors.grey, fontSize: 12)),
                        RotatedBox(
                          quarterTurns: 3,
                          child: Slider(
                            value: _gimbalPitch,
                            min: -90,
                            max: 30,
                            onChanged: (v) {
                              setState(() => _gimbalPitch = v);
                              ref
                                  .read(websocketServiceProvider)
                                  .sendGimbalControl(
                                    droneId: widget.droneId,
                                    pitch: v,
                                  );
                            },
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.camera_alt,
                                  color: Colors.white),
                              tooltip: l10n.capturePhoto,
                              onPressed: () => ref
                                  .read(websocketServiceProvider)
                                  .sendCameraCommand(
                                      widget.droneId, 'capture_photo'),
                            ),
                            IconButton(
                              icon: Icon(
                                _isRecording
                                    ? Icons.stop_circle
                                    : Icons.videocam,
                                color: _isRecording ? Colors.red : Colors.white,
                              ),
                              tooltip: _isRecording
                                  ? l10n.stopRecord
                                  : l10n.startRecord,
                              onPressed: () {
                                final cmd = _isRecording
                                    ? 'stop_video'
                                    : 'start_video';
                                ref
                                    .read(websocketServiceProvider)
                                    .sendCameraCommand(widget.droneId, cmd);
                                setState(() => _isRecording = !_isRecording);
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        EmergencyStopButton(
                          onConfirmed: _emergencyStop,
                        ),
                      ],
                    ),
                  ),

                  // Right joystick (Roll + Pitch)
                  Expanded(
                    child: _JoystickPanel(
                      label: 'Roll / Pitch',
                      onChanged: (x, y) {
                        _roll = x;
                        _pitch = y;
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TelemetryHud extends StatelessWidget {
  final dynamic live;
  final AppLocalizations l10n;

  const _TelemetryHud({required this.live, required this.l10n});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.grey.shade900,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          BatteryIndicator(percent: live?.batteryPercent),
          _HudVal(
              label: l10n.altitude,
              value:
                  '${live?.altitudeMeters?.toStringAsFixed(1) ?? '--'} m'),
          _HudVal(
              label: l10n.speed,
              value:
                  '${live?.speedMps?.toStringAsFixed(1) ?? '--'} m/s'),
          _HudVal(
              label: l10n.gps,
              value: '${live?.gpsSatellites ?? '--'} sat'),
          _HudVal(
              label: l10n.flightMode,
              value: live?.flightMode ?? '--'),
          SignalIndicator(rssi: live?.rssi),
        ],
      ),
    );
  }
}

class _HudVal extends StatelessWidget {
  final String label;
  final String value;
  const _HudVal({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label,
            style: const TextStyle(color: Colors.grey, fontSize: 10)),
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _CommandBar extends StatelessWidget {
  final AppLocalizations l10n;
  final VoidCallback onTakeoff;
  final VoidCallback onLand;
  final VoidCallback onRth;
  final VoidCallback onHover;

  const _CommandBar({
    required this.l10n,
    required this.onTakeoff,
    required this.onLand,
    required this.onRth,
    required this.onHover,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.grey.shade900,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _CmdButton(
              icon: Icons.flight_takeoff,
              label: l10n.takeoff,
              color: Colors.green,
              onTap: onTakeoff),
          _CmdButton(
              icon: Icons.flight_land,
              label: l10n.land,
              color: Colors.blue,
              onTap: onLand),
          _CmdButton(
              icon: Icons.home,
              label: l10n.returnHome,
              color: Colors.orange,
              onTap: onRth),
          _CmdButton(
              icon: Icons.pause_circle_outline,
              label: l10n.hover,
              color: Colors.yellow,
              onTap: onHover),
        ],
      ),
    );
  }
}

class _CmdButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _CmdButton(
      {required this.icon,
      required this.label,
      required this.color,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      style: TextButton.styleFrom(foregroundColor: color),
      icon: Icon(icon, size: 18),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      onPressed: onTap,
    );
  }
}

// Virtual joystick implementation
class _JoystickPanel extends StatefulWidget {
  final String label;
  final void Function(double x, double y) onChanged;

  const _JoystickPanel(
      {required this.label, required this.onChanged});

  @override
  State<_JoystickPanel> createState() => _JoystickPanelState();
}

class _JoystickPanelState extends State<_JoystickPanel> {
  double _dx = 0, _dy = 0;
  bool _active = false;

  static const double _radius = 100;
  static const double _knobRadius = 24;

  Offset _center = Offset.zero;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (ctx, constraints) {
        _center = Offset(constraints.maxWidth / 2, constraints.maxHeight / 2);
        return GestureDetector(
          onPanStart: (d) {
            setState(() => _active = true);
          },
          onPanUpdate: (d) {
            final pos = d.localPosition;
            final dx = (pos.dx - _center.dx).clamp(-_radius, _radius);
            final dy = (pos.dy - _center.dy).clamp(-_radius, _radius);
            setState(() {
              _dx = dx / _radius;
              _dy = -dy / _radius; // invert Y
            });
            widget.onChanged(_dx, _dy);
          },
          onPanEnd: (_) {
            setState(() {
              _active = false;
              _dx = 0;
              _dy = 0;
            });
            widget.onChanged(0, 0);
          },
          child: CustomPaint(
            painter: _JoystickPainter(
              dx: _dx,
              dy: _dy,
              radius: _radius,
              knobRadius: _knobRadius,
              active: _active,
            ),
            child: Center(
              child: Text(
                widget.label,
                style: TextStyle(
                  color: Colors.grey.withOpacity(0.4),
                  fontSize: 11,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _JoystickPainter extends CustomPainter {
  final double dx, dy, radius, knobRadius;
  final bool active;

  _JoystickPainter({
    required this.dx,
    required this.dy,
    required this.radius,
    required this.knobRadius,
    required this.active,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // Base circle
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = Colors.grey.withOpacity(0.15)
        ..style = PaintingStyle.fill,
    );
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = Colors.grey.withOpacity(0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );

    // Cross lines
    final linePaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..strokeWidth = 1;
    canvas.drawLine(
        center.translate(-radius, 0), center.translate(radius, 0), linePaint);
    canvas.drawLine(
        center.translate(0, -radius), center.translate(0, radius), linePaint);

    // Knob
    final knobPos = center + Offset(dx * radius, -dy * radius);
    canvas.drawCircle(
      knobPos,
      knobRadius,
      Paint()
        ..color = active
            ? Colors.blue.withOpacity(0.8)
            : Colors.grey.withOpacity(0.5)
        ..style = PaintingStyle.fill,
    );
    canvas.drawCircle(
      knobPos,
      knobRadius,
      Paint()
        ..color = active ? Colors.blue : Colors.grey
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(_JoystickPainter old) =>
      dx != old.dx || dy != old.dy || active != old.active;
}

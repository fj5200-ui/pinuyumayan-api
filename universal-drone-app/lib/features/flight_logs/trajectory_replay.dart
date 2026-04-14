import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/api/api_client.dart';
import '../../l10n/app_localizations.dart';

final _trajectoryProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, logId) async {
  final api = ref.read(apiClientProvider);
  return api.getTrajectory(logId);
});

class TrajectoryReplayScreen extends ConsumerStatefulWidget {
  final int logId;
  const TrajectoryReplayScreen({super.key, required this.logId});

  @override
  ConsumerState<TrajectoryReplayScreen> createState() =>
      _TrajectoryReplayScreenState();
}

class _TrajectoryReplayScreenState
    extends ConsumerState<TrajectoryReplayScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _playCtrl;
  bool _playing = false;
  int _playIndex = 0;
  List<LatLng> _points = [];
  final _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _playCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 30),
    )..addListener(() {
        if (_points.isEmpty) return;
        final newIndex = (_playCtrl.value * _points.length).floor();
        if (newIndex != _playIndex) {
          setState(() => _playIndex = newIndex.clamp(0, _points.length - 1));
          if (_playIndex < _points.length) {
            _mapController.move(_points[_playIndex], _mapController.camera.zoom);
          }
        }
      });
  }

  @override
  void dispose() {
    _playCtrl.dispose();
    _mapController.dispose();
    super.dispose();
  }

  List<LatLng> _parseTrajectory(Map<String, dynamic> geo) {
    try {
      final coords =
          (geo['geometry']?['coordinates'] as List?) ?? [];
      return coords
          .map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()))
          .toList();
    } catch (_) {
      return [];
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final trajAsync = ref.watch(_trajectoryProvider(widget.logId));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.trajectoryReplay)),
      body: trajAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(l10n.error)),
        data: (traj) {
          if (_points.isEmpty) {
            _points = _parseTrajectory(traj);
          }
          if (_points.isEmpty) {
            return const Center(child: Text('無軌跡資料'));
          }

          final currentPoint = _points[_playIndex];

          return Column(
            children: [
              // Map
              Expanded(
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _points.first,
                    initialZoom: 15,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName:
                          'com.example.universal_drone_app',
                    ),
                    // Full path (grey)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: _points,
                          strokeWidth: 2,
                          color: Colors.grey.withOpacity(0.5),
                        ),
                      ],
                    ),
                    // Played path (blue)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: _points.sublist(0, _playIndex + 1),
                          strokeWidth: 3,
                          color: Colors.blue,
                        ),
                      ],
                    ),
                    // Current drone position
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: currentPoint,
                          width: 32,
                          height: 32,
                          child: const Icon(Icons.flight,
                              color: Colors.blue, size: 24),
                        ),
                      ],
                    ),
                    // Start/end markers
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _points.first,
                          width: 20,
                          height: 20,
                          child: const Icon(Icons.flag,
                              color: Colors.green, size: 16),
                        ),
                        Marker(
                          point: _points.last,
                          width: 20,
                          height: 20,
                          child: const Icon(Icons.flag,
                              color: Colors.red, size: 16),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Playback controls
              Container(
                padding: const EdgeInsets.all(12),
                color: Theme.of(context).colorScheme.surface,
                child: Column(
                  children: [
                    Slider(
                      value: _playIndex.toDouble(),
                      max: (_points.length - 1).toDouble(),
                      onChanged: (v) {
                        _playCtrl.value =
                            v / (_points.length - 1);
                        setState(() => _playIndex = v.round());
                      },
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.skip_previous),
                          onPressed: () {
                            _playCtrl.reset();
                            setState(() => _playIndex = 0);
                          },
                        ),
                        IconButton(
                          icon: Icon(
                              _playing ? Icons.pause : Icons.play_arrow),
                          iconSize: 32,
                          onPressed: () {
                            if (_playing) {
                              _playCtrl.stop();
                            } else {
                              _playCtrl.forward();
                            }
                            setState(() => _playing = !_playing);
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.skip_next),
                          onPressed: () {
                            setState(
                                () => _playIndex = _points.length - 1);
                          },
                        ),
                        const SizedBox(width: 16),
                        Text(
                          '${_playIndex + 1} / ${_points.length}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

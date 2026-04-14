import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../core/api/api_client.dart';
import '../../core/providers/drone_provider.dart';
import '../../core/providers/settings_provider.dart';
import '../../l10n/app_localizations.dart';

class MissionEditorScreen extends ConsumerStatefulWidget {
  final int? missionId;
  const MissionEditorScreen({super.key, this.missionId});

  @override
  ConsumerState<MissionEditorScreen> createState() =>
      _MissionEditorScreenState();
}

class _MissionEditorScreenState extends ConsumerState<MissionEditorScreen> {
  final _nameCtrl = TextEditingController(text: '新任務');
  final List<LatLng> _waypoints = [];
  int? _selectedDroneId;
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final dronesAsync = ref.watch(droneListProvider);
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.missionId == null
            ? l10n.createMission
            : l10n.edit),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.save),
            label: Text(l10n.save),
            onPressed: _saving ? null : _saveMission,
          ),
        ],
      ),
      body: Column(
        children: [
          // Settings bar
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _nameCtrl,
                    decoration: InputDecoration(
                      labelText: l10n.missionName,
                      border: const OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                dronesAsync.maybeWhen(
                  data: (drones) => DropdownButton<int>(
                    hint: Text(l10n.drones),
                    value: _selectedDroneId,
                    items: drones
                        .map((d) => DropdownMenuItem(
                              value: d.id,
                              child: Text(d.name),
                            ))
                        .toList(),
                    onChanged: (v) =>
                        setState(() => _selectedDroneId = v),
                  ),
                  orElse: () => const SizedBox.shrink(),
                ),
              ],
            ),
          ),

          // Waypoints count chip
          if (_waypoints.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  Chip(
                    label: Text(l10n.waypointCount(_waypoints.length)),
                    avatar: const Icon(Icons.pin_drop, size: 16),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    label: Text(l10n.delete,
                        style: const TextStyle(color: Colors.red)),
                    onPressed: () =>
                        setState(() => _waypoints.removeLast()),
                  ),
                ],
              ),
            ),

          // Map for placing waypoints
          Expanded(
            child: FlutterMap(
              options: MapOptions(
                initialCenter: const LatLng(25.033, 121.565),
                initialZoom: 14,
                onTap: (_, point) {
                  setState(() => _waypoints.add(point));
                },
              ),
              children: [
                TileLayer(
                  urlTemplate:
                      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.example.universal_drone_app',
                ),
                // Waypoint path
                if (_waypoints.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: _waypoints,
                        strokeWidth: 2,
                        color: Colors.blue,
                        isDotted: false,
                      ),
                    ],
                  ),
                // Waypoint markers
                MarkerLayer(
                  markers: _waypoints.asMap().entries.map((e) {
                    final i = e.key;
                    final pt = e.value;
                    return Marker(
                      point: pt,
                      width: 28,
                      height: 28,
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${i + 1}',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),

          // Hint
          Padding(
            padding: const EdgeInsets.all(8),
            child: Text(
              '點擊地圖新增航點',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveMission() async {
    if (_selectedDroneId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('請選擇無人機')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      final mission = await api.createMission({
        'name': _nameCtrl.text,
        'droneId': _selectedDroneId,
      });
      final missionId = mission['id'] as int;
      for (var i = 0; i < _waypoints.length; i++) {
        await api.addWaypoint(missionId, {
          'sequence': i + 1,
          'latitude': _waypoints[i].latitude,
          'longitude': _waypoints[i].longitude,
          'altitudeMeters': 30.0,
        });
      }
      if (mounted) context.go('/missions');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('儲存失敗：$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

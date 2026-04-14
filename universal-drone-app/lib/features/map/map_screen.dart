import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../core/providers/drone_provider.dart';
import '../../core/providers/settings_provider.dart';
import '../../core/api/websocket_service.dart';
import '../../core/models/drone.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/battery_indicator.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final dronesAsync = ref.watch(droneListProvider);
    final telemetryMap = ref.watch(telemetryProvider);
    final settings = ref.watch(settingsProvider);
    final selectedDroneId = ref.watch(selectedDroneIdProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.map),
        actions: [
          _MapSourceSelector(
            current: settings.mapSource,
            onChanged: (s) =>
                ref.read(settingsProvider.notifier).setMapSource(s),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: const LatLng(25.033, 121.565),
              initialZoom: 13,
              onLongPress: (_, point) => _onMapLongPress(context, point),
            ),
            children: [
              // Tile layer based on settings
              _buildTileLayer(settings.mapSource),

              // Drone markers
              MarkerLayer(
                markers: dronesAsync.maybeWhen(
                  data: (drones) => drones.map((drone) {
                    final live = telemetryMap[drone.id];
                    final lat =
                        live?.latitude ?? drone.live?.latitude ?? drone.homeLatitude;
                    final lon = live?.longitude ??
                        drone.live?.longitude ?? drone.homeLongitude;
                    if (lat == null || lon == null) return null;
                    return Marker(
                      point: LatLng(lat, lon),
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () {
                          ref.read(selectedDroneIdProvider.notifier).state = drone.id;
                        },
                        child: _DroneMarker(
                          drone: drone,
                          isSelected: selectedDroneId == drone.id,
                          heading: null,
                        ),
                      ),
                    );
                  }).whereType<Marker>().toList(),
                  orElse: () => [],
                ),
              ),
            ],
          ),

          // Mini HUD at bottom
          if (selectedDroneId != null)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: _MiniHud(droneId: selectedDroneId),
            ),
        ],
      ),
    );
  }

  TileLayer _buildTileLayer(MapSource source) {
    switch (source) {
      case MapSource.osm:
        return TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.universal_drone_app',
        );
      case MapSource.google:
        // Google Maps satellite
        return TileLayer(
          urlTemplate:
              'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          userAgentPackageName: 'com.example.universal_drone_app',
        );
      case MapSource.mapbox:
        return TileLayer(
          urlTemplate:
              'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token={accessToken}',
          additionalOptions: const {
            'accessToken': 'YOUR_MAPBOX_TOKEN',
          },
          userAgentPackageName: 'com.example.universal_drone_app',
        );
    }
  }

  void _onMapLongPress(BuildContext context, LatLng point) {
    final l10n = AppLocalizations.of(context);
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.add_location),
              title: Text(l10n.addWaypoint),
              subtitle: Text(
                  '${point.latitude.toStringAsFixed(5)}, ${point.longitude.toStringAsFixed(5)}'),
              onTap: () {
                Navigator.pop(context);
                context.go('/missions/new');
              },
            ),
            ListTile(
              leading: const Icon(Icons.navigation),
              title: Text(l10n.get('goto') ?? 'GoTo'),
              onTap: () {
                Navigator.pop(context);
                _sendGoto(point);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _sendGoto(LatLng point) {
    final droneId = ref.read(selectedDroneIdProvider);
    if (droneId == null) return;
    ref.read(websocketServiceProvider).sendGoto(
          droneId: droneId,
          latitude: point.latitude,
          longitude: point.longitude,
          altitude: 30,
        );
  }
}

class _DroneMarker extends StatelessWidget {
  final Drone drone;
  final bool isSelected;
  final double? heading;

  const _DroneMarker(
      {required this.drone, required this.isSelected, this.heading});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(drone.status);
    return Transform.rotate(
      angle: (heading ?? 0) * 3.14159 / 180,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (isSelected)
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withOpacity(0.2),
                border: Border.all(color: color, width: 2),
              ),
            ),
          Icon(Icons.flight, color: color, size: isSelected ? 24 : 20),
        ],
      ),
    );
  }

  Color _statusColor(DroneStatus status) {
    switch (status) {
      case DroneStatus.flying:
        return Colors.green;
      case DroneStatus.returning:
        return Colors.orange;
      case DroneStatus.error:
        return Colors.red;
      case DroneStatus.offline:
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }
}

class _MiniHud extends ConsumerWidget {
  final int droneId;
  const _MiniHud({required this.droneId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final live = ref.watch(droneTelemetryProvider(droneId));

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            BatteryIndicator(percent: live?.batteryPercent),
            _HudItem(
              icon: Icons.height,
              label: l10n.altitude,
              value:
                  '${live?.altitudeMeters?.toStringAsFixed(1) ?? '--'} m',
            ),
            _HudItem(
              icon: Icons.speed,
              label: l10n.speed,
              value:
                  '${live?.speedMps?.toStringAsFixed(1) ?? '--'} m/s',
            ),
            _HudItem(
              icon: Icons.satellite_alt,
              label: l10n.gps,
              value: '${live?.gpsSatellites ?? '--'}',
            ),
            _HudItem(
              icon: Icons.flight_takeoff,
              label: l10n.flightMode,
              value: live?.flightMode ?? '--',
            ),
            IconButton(
              icon: const Icon(Icons.gamepad_outlined),
              tooltip: l10n.control,
              onPressed: () => context.go('/control/$droneId'),
            ),
          ],
        ),
      ),
    );
  }
}

class _HudItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _HudItem(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: Colors.grey),
            const SizedBox(width: 3),
            Text(label,
                style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
        Text(value,
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _MapSourceSelector extends StatelessWidget {
  final MapSource current;
  final ValueChanged<MapSource> onChanged;

  const _MapSourceSelector(
      {required this.current, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<MapSource>(
      icon: const Icon(Icons.layers_outlined),
      tooltip: AppLocalizations.of(context).mapSource,
      onSelected: onChanged,
      itemBuilder: (_) => [
        _item(MapSource.osm, 'OpenStreetMap', Icons.map),
        _item(MapSource.google, 'Google Maps', Icons.satellite_alt),
        _item(MapSource.mapbox, 'Mapbox', Icons.terrain),
      ],
    );
  }

  PopupMenuItem<MapSource> _item(
      MapSource source, String label, IconData icon) {
    return PopupMenuItem(
      value: source,
      child: Row(
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 8),
          Text(label),
          if (current == source) ...[
            const Spacer(),
            const Icon(Icons.check, size: 16, color: Colors.green),
          ],
        ],
      ),
    );
  }
}


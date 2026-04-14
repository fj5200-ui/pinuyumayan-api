import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/providers/drone_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/battery_indicator.dart';
import '../../widgets/signal_indicator.dart';
import '../../widgets/status_badge.dart';
import '../../core/models/drone.dart';

final _fleetGroupsProvider = FutureProvider((ref) async {
  final api = ref.read(apiClientProvider);
  return api.getFleetGroups();
});

class FleetScreen extends ConsumerWidget {
  const FleetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final groupsAsync = ref.watch(_fleetGroupsProvider);
    final dronesAsync = ref.watch(droneListProvider);
    final telemetryMap = ref.watch(telemetryProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.fleet),
        actions: [
          dronesAsync.maybeWhen(
            data: (drones) {
              final online = drones
                  .where((d) =>
                      d.status != DroneStatus.offline &&
                      d.status != DroneStatus.maintenance)
                  .length;
              return Chip(
                label: Text(l10n.onlineDrones(online),
                    style: const TextStyle(fontSize: 12)),
                backgroundColor: Colors.green.withOpacity(0.2),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: dronesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(l10n.error)),
        data: (drones) => ListView(
          padding: const EdgeInsets.all(12),
          children: [
            // All drones table
            Text('所有無人機',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Card(
              child: DataTable(
                columnSpacing: 12,
                columns: const [
                  DataColumn(label: Text('名稱')),
                  DataColumn(label: Text('狀態')),
                  DataColumn(label: Text('電池')),
                  DataColumn(label: Text('訊號')),
                  DataColumn(label: Text('高度')),
                  DataColumn(label: Text('')),
                ],
                rows: drones.map((d) {
                  final live = telemetryMap[d.id];
                  return DataRow(cells: [
                    DataCell(Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.flight, size: 16),
                        const SizedBox(width: 4),
                        Text(d.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w500)),
                      ],
                    )),
                    DataCell(StatusBadge(status: d.status)),
                    DataCell(BatteryIndicator(
                        percent: live?.batteryPercent ??
                            d.live?.batteryPercent)),
                    DataCell(
                        SignalIndicator(rssi: live?.rssi ?? d.live?.rssi)),
                    DataCell(Text(
                      '${(live?.altitudeMeters ?? d.live?.altitudeMeters)?.toStringAsFixed(1) ?? '--'} m',
                    )),
                    DataCell(IconButton(
                      icon: const Icon(Icons.gamepad_outlined, size: 18),
                      onPressed: () => context.go('/control/${d.id}'),
                    )),
                  ]);
                }).toList(),
              ),
            ),
            const SizedBox(height: 20),

            // Fleet groups
            Text(l10n.fleetGroup,
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            groupsAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox.shrink(),
              data: (groups) => groups.isEmpty
                  ? const Text('尚無編隊群組',
                      style: TextStyle(color: Colors.grey))
                  : Column(
                      children: groups
                          .map((g) => _FleetGroupCard(group: g))
                          .toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FleetGroupCard extends StatelessWidget {
  final dynamic group;
  const _FleetGroupCard({required this.group});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Card(
      child: ListTile(
        leading: const Icon(Icons.group_work_outlined),
        title: Text(group['name'] ?? '群組'),
        subtitle: Text(
            '${l10n.masterDrone}: ${group['masterDroneId'] ?? '--'}'),
      ),
    );
  }
}

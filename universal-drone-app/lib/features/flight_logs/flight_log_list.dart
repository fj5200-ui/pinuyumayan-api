import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/models/flight_log.dart';
import '../../core/providers/drone_provider.dart';
import '../../l10n/app_localizations.dart';

final _flightLogsProvider =
    FutureProvider.family<List<FlightLog>, int?>((ref, droneId) async {
  final api = ref.read(apiClientProvider);
  final data = await api.getFlightLogs(droneId: droneId);
  return data.map((d) => FlightLog.fromJson(d)).toList();
});

class FlightLogListScreen extends ConsumerStatefulWidget {
  const FlightLogListScreen({super.key});

  @override
  ConsumerState<FlightLogListScreen> createState() =>
      _FlightLogListScreenState();
}

class _FlightLogListScreenState extends ConsumerState<FlightLogListScreen> {
  int? _selectedDroneId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final logsAsync = ref.watch(_flightLogsProvider(_selectedDroneId));
    final dronesAsync = ref.watch(droneListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.flightLogs),
        actions: [
          dronesAsync.maybeWhen(
            data: (drones) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: DropdownButton<int?>(
                hint: const Text('全部'),
                value: _selectedDroneId,
                underline: const SizedBox.shrink(),
                items: [
                  const DropdownMenuItem(value: null, child: Text('全部')),
                  ...drones.map((d) => DropdownMenuItem(
                        value: d.id,
                        child: Text(d.name),
                      )),
                ],
                onChanged: (v) => setState(() => _selectedDroneId = v),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: logsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(l10n.error)),
        data: (logs) => logs.isEmpty
            ? Center(child: Text(l10n.noData))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: logs.length,
                itemBuilder: (_, i) => _FlightLogTile(log: logs[i]),
              ),
      ),
    );
  }
}

class _FlightLogTile extends StatelessWidget {
  final FlightLog log;
  const _FlightLogTile({required this.log});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final duration = log.durationSeconds != null
        ? '${(log.durationSeconds! ~/ 60).toString().padLeft(2, '0')}:${(log.durationSeconds! % 60).toString().padLeft(2, '0')}'
        : '--';

    return Card(
      child: ListTile(
        leading: const CircleAvatar(
          child: Icon(Icons.flight_takeoff, size: 20),
        ),
        title: Text(
          log.startedAt.substring(0, 16),
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Row(
          children: [
            _StatChip(icon: Icons.timer, value: duration),
            const SizedBox(width: 8),
            _StatChip(
                icon: Icons.height,
                value:
                    '${log.maxAltitudeMeters?.toStringAsFixed(0) ?? '--'} m'),
            const SizedBox(width: 8),
            _StatChip(
                icon: Icons.route,
                value:
                    '${log.distanceKm?.toStringAsFixed(2) ?? '--'} km'),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.replay_outlined),
          tooltip: l10n.trajectoryReplay,
          onPressed: () =>
              context.go('/flight-logs/${log.id}/replay'),
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String value;
  const _StatChip({required this.icon, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: Colors.grey),
        const SizedBox(width: 2),
        Text(value, style: const TextStyle(fontSize: 11)),
      ],
    );
  }
}

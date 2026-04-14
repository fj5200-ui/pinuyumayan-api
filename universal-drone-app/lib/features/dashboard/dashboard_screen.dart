import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/drone_provider.dart';
import '../../core/providers/alert_provider.dart';
import '../../core/api/websocket_service.dart';
import '../../core/models/drone.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/battery_indicator.dart';
import '../../widgets/signal_indicator.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = ref.read(authProvider);
      if (!auth.isLoggedIn) {
        context.go('/login');
        return;
      }
      // Connect WebSocket
      ref.read(websocketServiceProvider).connect();
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final dronesAsync = ref.watch(droneListProvider);
    final alerts = ref.watch(alertsProvider);
    final ws = ref.watch(websocketServiceProvider);
    final unresolvedCount = ref.watch(unresolvedAlertsCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.dashboard),
        actions: [
          if (unresolvedCount > 0)
            IconButton(
              icon: Badge(
                count: unresolvedCount,
                child: const Icon(Icons.notifications),
              ),
              onPressed: () => context.go('/alerts'),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(droneListProvider.notifier).load(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              ws.disconnect();
              await ref.read(authProvider.notifier).logout();
              if (mounted) context.go('/login');
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddDroneDialog(context),
        icon: const Icon(Icons.add),
        label: Text(l10n.addDrone),
      ),
      body: Column(
        children: [
          // Alert banners
          ...alerts
              .where((a) => !a.resolved)
              .take(3)
              .map((a) => _AlertBanner(alert: a)),

          // Drone grid
          Expanded(
            child: dronesAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(l10n.error),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () =>
                          ref.read(droneListProvider.notifier).load(),
                      child: Text(l10n.retry),
                    ),
                  ],
                ),
              ),
              data: (drones) => drones.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.flight_outlined,
                              size: 64, color: Colors.grey),
                          const SizedBox(height: 16),
                          Text(l10n.noData,
                              style:
                                  const TextStyle(color: Colors.grey)),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate:
                          const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 340,
                        childAspectRatio: 1.3,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: drones.length,
                      itemBuilder: (_, i) => _DroneCard(drone: drones[i]),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddDroneDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final nameCtrl = TextEditingController();
    final modelCtrl = TextEditingController();
    final serialCtrl = TextEditingController();
    String brand = 'dji';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text(l10n.addDrone),
          content: SizedBox(
            width: 360,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: l10n.name),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: brand,
                  decoration: InputDecoration(labelText: l10n.brand),
                  items: ['dji', 'autel', 'px4', 'ardupilot', 'custom']
                      .map((b) => DropdownMenuItem(value: b, child: Text(b.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setState(() => brand = v ?? 'dji'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: modelCtrl,
                  decoration: InputDecoration(labelText: l10n.model),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: serialCtrl,
                  decoration: InputDecoration(labelText: l10n.serialNumber),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () async {
                await ref.read(droneListProvider.notifier).addDrone({
                  'name': nameCtrl.text,
                  'brand': brand,
                  'model': modelCtrl.text,
                  'serialNumber': serialCtrl.text,
                });
                if (ctx.mounted) Navigator.of(ctx).pop();
              },
              child: Text(l10n.save),
            ),
          ],
        ),
      ),
    );
  }
}

class _DroneCard extends ConsumerWidget {
  final Drone drone;

  const _DroneCard({required this.drone});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final live = ref.watch(droneTelemetryProvider(drone.id));

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/control/${drone.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.flight, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      drone.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  StatusBadge(status: drone.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${drone.brand.name.toUpperCase()} ${drone.model}',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
              const Spacer(),
              Row(
                children: [
                  BatteryIndicator(
                      percent: live?.batteryPercent ?? drone.live?.batteryPercent),
                  const Spacer(),
                  const Icon(Icons.satellite_alt, size: 14, color: Colors.grey),
                  const SizedBox(width: 3),
                  Text(
                    '${live?.gpsSatellites ?? drone.live?.gpsSatellites ?? '--'}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(width: 8),
                  SignalIndicator(rssi: live?.rssi ?? drone.live?.rssi),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _TelItem(
                    label: l10n.altitude,
                    value:
                        '${(live?.altitudeMeters ?? drone.live?.altitudeMeters)?.toStringAsFixed(1) ?? '--'} m',
                  ),
                  const SizedBox(width: 12),
                  _TelItem(
                    label: l10n.speed,
                    value:
                        '${(live?.speedMps ?? drone.live?.speedMps)?.toStringAsFixed(1) ?? '--'} m/s',
                  ),
                  const SizedBox(width: 12),
                  _TelItem(
                    label: l10n.flightMode,
                    value: live?.flightMode ?? drone.live?.flightMode ?? '--',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TelItem extends StatelessWidget {
  final String label;
  final String value;

  const _TelItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 10, color: Colors.grey)),
        Text(value,
            style: const TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _AlertBanner extends StatelessWidget {
  final alert;

  const _AlertBanner({required this.alert});

  @override
  Widget build(BuildContext context) {
    final color = alert.severity.name == 'critical'
        ? Colors.red
        : alert.severity.name == 'warning'
            ? Colors.orange
            : Colors.blue;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: color.withOpacity(0.15),
      child: Row(
        children: [
          Icon(Icons.warning_amber, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              alert.message,
              style: TextStyle(color: color, fontSize: 13),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 16),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

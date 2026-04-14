import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/alert_provider.dart';
import '../../core/models/alert.dart';
import '../../l10n/app_localizations.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.alerts),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                ref.read(alertsProvider.notifier).load(),
          ),
        ],
      ),
      body: alerts.isEmpty
          ? Center(child: Text(l10n.noData))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: alerts.length,
              itemBuilder: (_, i) => _AlertTile(alert: alerts[i]),
            ),
    );
  }
}

class _AlertTile extends ConsumerWidget {
  final Alert alert;
  const _AlertTile({required this.alert});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final color = _severityColor(alert.severity);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.15),
          child: Icon(_alertIcon(alert.type), color: color, size: 20),
        ),
        title: Text(
          alert.message,
          style: TextStyle(
            decoration: alert.resolved ? TextDecoration.lineThrough : null,
            color: alert.resolved ? Colors.grey : null,
          ),
        ),
        subtitle: Text(
          '${_severityLabel(alert.severity, l10n)}  ·  Drone #${alert.droneId}  ·  ${alert.createdAt?.substring(0, 16) ?? ''}',
          style: const TextStyle(fontSize: 11),
        ),
        trailing: alert.resolved
            ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
            : TextButton(
                onPressed: () =>
                    ref.read(alertsProvider.notifier).resolve(alert.id),
                child: Text(l10n.resolve,
                    style: const TextStyle(fontSize: 11)),
              ),
      ),
    );
  }

  Color _severityColor(AlertSeverity s) {
    switch (s) {
      case AlertSeverity.critical:
        return Colors.red;
      case AlertSeverity.warning:
        return Colors.orange;
      case AlertSeverity.info:
        return Colors.blue;
    }
  }

  IconData _alertIcon(AlertType type) {
    switch (type) {
      case AlertType.lowBattery:
        return Icons.battery_alert;
      case AlertType.lostConnection:
        return Icons.signal_wifi_off;
      case AlertType.geofenceBreach:
        return Icons.fence;
      case AlertType.gpsAnomaly:
        return Icons.gps_off;
      case AlertType.motorError:
        return Icons.settings_suggest;
      case AlertType.highWind:
        return Icons.air;
      case AlertType.custom:
        return Icons.warning_amber;
    }
  }

  String _severityLabel(AlertSeverity s, AppLocalizations l10n) {
    switch (s) {
      case AlertSeverity.critical:
        return l10n.get('severityCritical');
      case AlertSeverity.warning:
        return l10n.get('severityWarning');
      case AlertSeverity.info:
        return l10n.get('severityInfo');
    }
  }
}

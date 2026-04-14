import 'package:flutter/material.dart';
import '../core/models/drone.dart';
import '../l10n/app_localizations.dart';

class StatusBadge extends StatelessWidget {
  final DroneStatus status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: _color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            l10n.droneStatus(status.name),
            style: TextStyle(
              color: _color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color get _color {
    switch (status) {
      case DroneStatus.flying:
        return Colors.green;
      case DroneStatus.preflight:
        return Colors.blue;
      case DroneStatus.returning:
        return Colors.orange;
      case DroneStatus.error:
        return Colors.red;
      case DroneStatus.maintenance:
        return Colors.purple;
      case DroneStatus.idle:
        return Colors.teal;
      case DroneStatus.offline:
        return Colors.grey;
    }
  }
}

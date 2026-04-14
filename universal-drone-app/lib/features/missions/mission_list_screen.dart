import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/models/mission.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/confirm_dialog.dart';

final _missionsProvider = FutureProvider<List<Mission>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.getMissions();
  return data.map((d) => Mission.fromJson(d)).toList();
});

class MissionListScreen extends ConsumerWidget {
  const MissionListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final missionsAsync = ref.watch(_missionsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.missions)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/missions/new'),
        icon: const Icon(Icons.add),
        label: Text(l10n.createMission),
      ),
      body: missionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(l10n.error)),
        data: (missions) => missions.isEmpty
            ? Center(child: Text(l10n.noData))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: missions.length,
                itemBuilder: (_, i) => _MissionTile(mission: missions[i]),
              ),
      ),
    );
  }
}

class _MissionTile extends ConsumerWidget {
  final Mission mission;
  const _MissionTile({required this.mission});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final statusColor = _statusColor(mission.status);

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Icon(Icons.route, color: statusColor),
        ),
        title: Text(mission.name),
        subtitle: Text(
          '${l10n.waypointCount(mission.waypoints.length)}  ·  ${_statusLabel(mission.status, l10n)}',
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (mission.status == MissionStatus.ready ||
                mission.status == MissionStatus.draft)
              IconButton(
                icon: const Icon(Icons.play_arrow, color: Colors.green),
                tooltip: l10n.startMission,
                onPressed: () => _start(context, ref),
              ),
            if (mission.status == MissionStatus.inProgress)
              IconButton(
                icon: const Icon(Icons.stop, color: Colors.red),
                tooltip: l10n.abortMission,
                onPressed: () => _abort(context, ref),
              ),
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () =>
                  context.go('/missions/${mission.id}/edit'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _start(BuildContext context, WidgetRef ref) async {
    final confirmed = await showConfirmDialog(
      context,
      title: AppLocalizations.of(context).startMission,
      message: '確定要開始任務「${mission.name}」嗎？',
    );
    if (!confirmed) return;
    await ref.read(apiClientProvider).startMission(mission.id);
    ref.invalidate(_missionsProvider);
  }

  Future<void> _abort(BuildContext context, WidgetRef ref) async {
    final confirmed = await showConfirmDialog(
      context,
      title: AppLocalizations.of(context).abortMission,
      message: '確定要中止任務嗎？無人機將懸停在當前位置。',
      isDangerous: true,
    );
    if (!confirmed) return;
    await ref.read(apiClientProvider).abortMission(mission.id);
    ref.invalidate(_missionsProvider);
  }

  Color _statusColor(MissionStatus status) {
    switch (status) {
      case MissionStatus.inProgress:
        return Colors.green;
      case MissionStatus.completed:
        return Colors.blue;
      case MissionStatus.aborted:
        return Colors.orange;
      case MissionStatus.failed:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(MissionStatus status, AppLocalizations l10n) {
    switch (status) {
      case MissionStatus.draft:
        return '草稿';
      case MissionStatus.ready:
        return '準備就緒';
      case MissionStatus.inProgress:
        return l10n.get('droneStatus_flying');
      case MissionStatus.completed:
        return '已完成';
      case MissionStatus.aborted:
        return '已中止';
      case MissionStatus.failed:
        return '失敗';
    }
  }
}

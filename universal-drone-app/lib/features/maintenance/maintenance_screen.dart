import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/providers/drone_provider.dart';
import '../../l10n/app_localizations.dart';

class MaintenanceScreen extends ConsumerStatefulWidget {
  const MaintenanceScreen({super.key});

  @override
  ConsumerState<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends ConsumerState<MaintenanceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  int? _selectedDroneId;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final dronesAsync = ref.watch(droneListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.maintenance),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: [
            Tab(text: l10n.maintenance),
            Tab(text: '電池'),
          ],
        ),
        actions: [
          dronesAsync.maybeWhen(
            data: (drones) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: DropdownButton<int>(
                hint: Text(l10n.drones),
                value: _selectedDroneId,
                underline: const SizedBox.shrink(),
                items: drones
                    .map((d) => DropdownMenuItem(
                          value: d.id,
                          child: Text(d.name),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _selectedDroneId = v),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddRecord(context),
        icon: const Icon(Icons.add),
        label: const Text('新增紀錄'),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _MaintenanceRecordsList(droneId: _selectedDroneId),
          _BatteriesList(droneId: _selectedDroneId),
        ],
      ),
    );
  }

  void _showAddRecord(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('新增維修紀錄'),
        content: const Text('功能開發中'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('關閉'),
          ),
        ],
      ),
    );
  }
}

class _MaintenanceRecordsList extends ConsumerWidget {
  final int? droneId;
  const _MaintenanceRecordsList({this.droneId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (droneId == null) {
      return const Center(child: Text('請選擇無人機'));
    }
    return FutureBuilder<List<dynamic>>(
      future: ref.read(apiClientProvider).getMaintenanceRecords(droneId!),
      builder: (_, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final records = snap.data ?? [];
        if (records.isEmpty) {
          return const Center(child: Text('尚無維修紀錄'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: records.length,
          itemBuilder: (_, i) {
            final r = records[i];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.build_outlined),
                title: Text(r['maintenanceType'] ?? '--'),
                subtitle: Text(r['notes'] ?? ''),
                trailing: Text(
                  (r['performedAt'] as String?)?.substring(0, 10) ?? '--',
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _BatteriesList extends ConsumerWidget {
  final int? droneId;
  const _BatteriesList({this.droneId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder<List<dynamic>>(
      future:
          ref.read(apiClientProvider).getBatteries(droneId: droneId),
      builder: (_, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final batteries = snap.data ?? [];
        if (batteries.isEmpty) {
          return const Center(child: Text('尚無電池資料'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: batteries.length,
          itemBuilder: (_, i) {
            final b = batteries[i];
            final health = b['healthPercent'] as int? ?? 0;
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      health > 80 ? Colors.green : Colors.orange,
                  child: Text('$health%',
                      style: const TextStyle(
                          color: Colors.white, fontSize: 11)),
                ),
                title: Text(b['serialNumber'] ?? 'Battery #${b['id']}'),
                subtitle: Row(
                  children: [
                    Text(
                        '${AppLocalizations.of(context).cycleCount}: ${b['cycleCount'] ?? 0}  ·  容量: ${b['capacityMah'] ?? '--'} mAh'),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

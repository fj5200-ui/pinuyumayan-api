import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/models/checklist.dart';
import '../../core/providers/drone_provider.dart';
import '../../l10n/app_localizations.dart';

final _checklistTemplatesProvider =
    FutureProvider<List<ChecklistTemplate>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.getChecklistTemplates();
  return data.map((d) => ChecklistTemplate.fromJson(d)).toList();
});

class ChecklistScreen extends ConsumerStatefulWidget {
  const ChecklistScreen({super.key});

  @override
  ConsumerState<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends ConsumerState<ChecklistScreen> {
  int? _selectedTemplateId;
  int? _selectedDroneId;
  Map<int, bool> _itemResults = {};
  bool _ran = false;
  bool _running = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final templatesAsync = ref.watch(_checklistTemplatesProvider);
    final dronesAsync = ref.watch(droneListProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.checklist)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Selectors
            Row(
              children: [
                Expanded(
                  child: templatesAsync.maybeWhen(
                    data: (templates) => DropdownButtonFormField<int>(
                      value: _selectedTemplateId,
                      decoration: InputDecoration(
                        labelText: '清單範本',
                        border: const OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: templates
                          .map((t) => DropdownMenuItem(
                              value: t.id, child: Text(t.name)))
                          .toList(),
                      onChanged: (v) {
                        setState(() {
                          _selectedTemplateId = v;
                          _ran = false;
                          _itemResults = {};
                        });
                      },
                    ),
                    orElse: () => const CircularProgressIndicator(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: dronesAsync.maybeWhen(
                    data: (drones) => DropdownButtonFormField<int>(
                      value: _selectedDroneId,
                      decoration: const InputDecoration(
                        labelText: '無人機',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: drones
                          .map((d) => DropdownMenuItem(
                              value: d.id, child: Text(d.name)))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _selectedDroneId = v),
                    ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Run button
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                icon: _running
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.checklist),
                label: Text(l10n.runChecklist),
                onPressed: (_selectedTemplateId == null ||
                        _selectedDroneId == null ||
                        _running)
                    ? null
                    : _runChecklist,
              ),
            ),
            const SizedBox(height: 16),

            // Results
            if (_ran)
              Expanded(
                child: templatesAsync.maybeWhen(
                  data: (templates) {
                    final template = templates.firstWhere(
                        (t) => t.id == _selectedTemplateId,
                        orElse: () => templates.first);
                    final allPassed = _itemResults.values.every((v) => v);
                    return Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: allPassed
                                ? Colors.green.withOpacity(0.15)
                                : Colors.red.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: allPassed ? Colors.green : Colors.red,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                allPassed
                                    ? Icons.check_circle
                                    : Icons.cancel,
                                color: allPassed ? Colors.green : Colors.red,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                allPassed
                                    ? l10n.allPassed
                                    : l10n.checklistFailed,
                                style: TextStyle(
                                  color:
                                      allPassed ? Colors.green : Colors.red,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: ListView.builder(
                            itemCount: template.items.length,
                            itemBuilder: (_, i) {
                              final item = template.items[i];
                              final passed =
                                  _itemResults[item.id] ?? false;
                              return ListTile(
                                leading: Icon(
                                  passed
                                      ? Icons.check_circle
                                      : Icons.cancel,
                                  color:
                                      passed ? Colors.green : Colors.red,
                                ),
                                title: Text(item.label),
                                subtitle: item.description != null
                                    ? Text(item.description!)
                                    : null,
                                trailing: item.isCritical
                                    ? const Chip(
                                        label: Text('關鍵',
                                            style: TextStyle(
                                                fontSize: 11)),
                                        backgroundColor: Colors.red,
                                      )
                                    : null,
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                  orElse: () => const SizedBox.shrink(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _runChecklist() async {
    setState(() => _running = true);
    try {
      final api = ref.read(apiClientProvider);
      final result =
          await api.runChecklist(_selectedTemplateId!, _selectedDroneId!);
      final passedIds = List<int>.from(result['passedItemIds'] ?? []);
      final failedIds = List<int>.from(result['failedItemIds'] ?? []);
      final results = <int, bool>{};
      for (final id in passedIds) {
        results[id] = true;
      }
      for (final id in failedIds) {
        results[id] = false;
      }
      setState(() {
        _itemResults = results;
        _ran = true;
      });
    } catch (_) {
    } finally {
      setState(() => _running = false);
    }
  }
}

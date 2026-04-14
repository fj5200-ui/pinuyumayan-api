import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/settings_provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/websocket_service.dart';
import '../../l10n/app_localizations.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late TextEditingController _serverUrlCtrl;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(settingsProvider);
    _serverUrlCtrl = TextEditingController(text: settings.serverUrl);
  }

  @override
  void dispose() {
    _serverUrlCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final settings = ref.watch(settingsProvider);
    final user = ref.watch(currentUserProvider);
    final wsService = ref.read(websocketServiceProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.settings)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User info
          if (user != null)
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  child: Text(user.name.substring(0, 1).toUpperCase()),
                ),
                title: Text(user.name),
                subtitle: Text('${user.email}  ·  ${l10n.role(user.role.name)}'),
                trailing: IconButton(
                  icon: const Icon(Icons.logout),
                  tooltip: l10n.logout,
                  onPressed: () async {
                    wsService.disconnect();
                    await ref.read(authProvider.notifier).logout();
                    if (mounted) context.go('/login');
                  },
                ),
              ),
            ),

          const SizedBox(height: 16),

          // Server URL
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.serverUrl,
                      style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _serverUrlCtrl,
                          decoration: InputDecoration(
                            border: const OutlineInputBorder(),
                            hintText: 'http://192.168.1.100:3000',
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.check),
                              onPressed: _saveServerUrl,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Map source
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.mapSource,
                      style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  SegmentedButton<MapSource>(
                    segments: [
                      ButtonSegment(
                          value: MapSource.osm,
                          label: Text(l10n.get('mapSourceOsm'))),
                      ButtonSegment(
                          value: MapSource.google,
                          label: Text(l10n.get('mapSourceGoogle'))),
                      ButtonSegment(
                          value: MapSource.mapbox,
                          label: Text(l10n.get('mapSourceMapbox'))),
                    ],
                    selected: {settings.mapSource},
                    onSelectionChanged: (s) => ref
                        .read(settingsProvider.notifier)
                        .setMapSource(s.first),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Offline mode
          Card(
            child: SwitchListTile(
              title: Text(l10n.offlineMode),
              subtitle: const Text('離線時使用本地快取，不連後端伺服器'),
              value: settings.offlineMode,
              onChanged: (v) =>
                  ref.read(settingsProvider.notifier).setOfflineMode(v),
            ),
          ),
          const SizedBox(height: 12),

          // Connection status
          Card(
            child: ListTile(
              leading: Icon(
                wsService.isConnected ? Icons.wifi : Icons.wifi_off,
                color: wsService.isConnected ? Colors.green : Colors.red,
              ),
              title: Text(wsService.isConnected
                  ? l10n.connected
                  : l10n.disconnected),
              trailing: TextButton(
                onPressed: wsService.isConnected
                    ? wsService.disconnect
                    : wsService.connect,
                child: Text(wsService.isConnected ? '斷線' : '連線'),
              ),
            ),
          ),

          const SizedBox(height: 24),
          // Version
          Center(
            child: Text(
              'Universal Drone Platform v1.0.0',
              style:
                  const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveServerUrl() async {
    final url = _serverUrlCtrl.text.trim();
    if (url.isEmpty) return;
    await ref.read(settingsProvider.notifier).setServerUrl(url);
    final api = ref.read(apiClientProvider);
    await api.setBaseUrl(url);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${AppLocalizations.of(context).serverUrl} 已儲存')),
      );
    }
  }
}

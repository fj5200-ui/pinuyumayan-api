import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum MapSource { osm, google, mapbox }

class AppSettings {
  final String serverUrl;
  final MapSource mapSource;
  final bool offlineMode;

  const AppSettings({
    this.serverUrl = 'http://localhost:3000',
    this.mapSource = MapSource.osm,
    this.offlineMode = false,
  });

  AppSettings copyWith({
    String? serverUrl,
    MapSource? mapSource,
    bool? offlineMode,
  }) {
    return AppSettings(
      serverUrl: serverUrl ?? this.serverUrl,
      mapSource: mapSource ?? this.mapSource,
      offlineMode: offlineMode ?? this.offlineMode,
    );
  }
}

class SettingsNotifier extends StateNotifier<AppSettings> {
  SettingsNotifier() : super(const AppSettings()) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final serverUrl =
        prefs.getString('server_url') ?? 'http://localhost:3000';
    final mapSourceIndex = prefs.getInt('map_source') ?? 0;
    final offlineMode = prefs.getBool('offline_mode') ?? false;
    state = AppSettings(
      serverUrl: serverUrl,
      mapSource: MapSource.values[mapSourceIndex],
      offlineMode: offlineMode,
    );
  }

  Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', url);
    state = state.copyWith(serverUrl: url);
  }

  Future<void> setMapSource(MapSource source) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('map_source', source.index);
    state = state.copyWith(mapSource: source);
  }

  Future<void> setOfflineMode(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('offline_mode', value);
    state = state.copyWith(offlineMode: value);
  }
}

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, AppSettings>((ref) {
  return SettingsNotifier();
});

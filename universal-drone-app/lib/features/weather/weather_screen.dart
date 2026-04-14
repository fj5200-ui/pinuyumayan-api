import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/models/weather.dart';
import '../../l10n/app_localizations.dart';

final _weatherProvider =
    FutureProvider.family<WeatherData, ({double lat, double lon})>(
        (ref, coords) async {
  final api = ref.read(apiClientProvider);
  final data = await api.getWeather(coords.lat, coords.lon);
  return WeatherData.fromJson(data);
});

final _airspaceProvider =
    FutureProvider.family<Map<String, dynamic>, ({double lat, double lon})>(
        (ref, coords) async {
  final api = ref.read(apiClientProvider);
  return api.checkAirspace(coords.lat, coords.lon);
});

class WeatherScreen extends ConsumerStatefulWidget {
  const WeatherScreen({super.key});

  @override
  ConsumerState<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends ConsumerState<WeatherScreen> {
  final _coords = (lat: 25.033, lon: 121.565);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final weatherAsync = ref.watch(_weatherProvider(_coords));
    final airspaceAsync = ref.watch(_airspaceProvider(_coords));

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.weather),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(_weatherProvider);
              ref.invalidate(_airspaceProvider);
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Weather card
          weatherAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(l10n.error),
              ),
            ),
            data: (weather) => _WeatherCard(weather: weather, l10n: l10n),
          ),
          const SizedBox(height: 16),

          // Airspace card
          airspaceAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
            data: (airspace) => _AirspaceCard(data: airspace, l10n: l10n),
          ),
        ],
      ),
    );
  }
}

class _WeatherCard extends StatelessWidget {
  final WeatherData weather;
  final AppLocalizations l10n;

  const _WeatherCard({required this.weather, required this.l10n});

  @override
  Widget build(BuildContext context) {
    final risk = weather.riskScore;
    final riskColor = risk < 30
        ? Colors.green
        : risk < 70
            ? Colors.orange
            : Colors.red;
    final riskLabel = l10n.weatherRisk(risk);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.cloud_outlined),
                const SizedBox(width: 8),
                Text(l10n.weather,
                    style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: riskColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: riskColor),
                  ),
                  child: Text(riskLabel,
                      style: TextStyle(
                          color: riskColor, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Risk bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: risk / 100,
                minHeight: 8,
                color: riskColor,
                backgroundColor: riskColor.withOpacity(0.2),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                _WeatherItem(
                    icon: Icons.thermostat,
                    label: l10n.temperature,
                    value: '${weather.temperatureCelsius.toStringAsFixed(1)} °C'),
                _WeatherItem(
                    icon: Icons.air,
                    label: l10n.windSpeed,
                    value: '${weather.windSpeedMps.toStringAsFixed(1)} m/s'),
                _WeatherItem(
                    icon: Icons.visibility,
                    label: l10n.visibility,
                    value:
                        '${(weather.visibilityMeters / 1000).toStringAsFixed(1)} km'),
                _WeatherItem(
                    icon: Icons.water_drop_outlined,
                    label: l10n.precipitation,
                    value: '${weather.precipitationMm.toStringAsFixed(1)} mm'),
                _WeatherItem(
                    icon: Icons.cloud,
                    label: '雲量',
                    value: '${weather.cloudPercent}%'),
              ],
            ),
            if (weather.description != null) ...[
              const SizedBox(height: 8),
              Text(weather.description!,
                  style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }
}

class _WeatherItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _WeatherItem(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(width: 4),
        Text('$label: ', style: const TextStyle(color: Colors.grey, fontSize: 12)),
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
      ],
    );
  }
}

class _AirspaceCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final AppLocalizations l10n;

  const _AirspaceCard({required this.data, required this.l10n});

  @override
  Widget build(BuildContext context) {
    final isSafe = data['safe'] as bool? ?? true;
    final zones = data['zones'] as List? ?? [];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isSafe ? Icons.check_circle : Icons.warning_amber,
                  color: isSafe ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 8),
                Text(l10n.airspaceCheck,
                    style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                Text(
                  isSafe ? l10n.airspaceSafe : l10n.airspaceRestricted,
                  style: TextStyle(
                    color: isSafe ? Colors.green : Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            if (zones.isNotEmpty) ...[
              const SizedBox(height: 12),
              ...zones.map((z) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.fence, size: 16, color: Colors.orange),
                    title: Text(z['name'] ?? '限制區域',
                        style: const TextStyle(fontSize: 13)),
                    subtitle:
                        Text(z['type'] ?? '', style: const TextStyle(fontSize: 11)),
                  )),
            ],
          ],
        ),
      ),
    );
  }
}

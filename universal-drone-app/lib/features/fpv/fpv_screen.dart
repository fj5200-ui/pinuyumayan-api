import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import '../../core/api/api_client.dart';
import '../../core/providers/drone_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/battery_indicator.dart';
import '../../widgets/signal_indicator.dart';

class FpvScreen extends ConsumerStatefulWidget {
  final int droneId;
  const FpvScreen({super.key, required this.droneId});

  @override
  ConsumerState<FpvScreen> createState() => _FpvScreenState();
}

class _FpvScreenState extends ConsumerState<FpvScreen> {
  VideoPlayerController? _vpCtrl;
  bool _loading = false;
  String? _rtspUrl;
  bool _isRecording = false;

  @override
  void initState() {
    super.initState();
    _loadRtspUrl();
    ref.read(telemetryProvider.notifier).subscribe(widget.droneId);
  }

  @override
  void dispose() {
    _vpCtrl?.dispose();
    ref.read(telemetryProvider.notifier).unsubscribe(widget.droneId);
    super.dispose();
  }

  Future<void> _loadRtspUrl() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.dio.get('/fpv-media/stream/${widget.droneId}');
      final url = res.data['rtspUrl'] as String?;
      if (url != null && url.isNotEmpty) {
        _rtspUrl = url;
        _vpCtrl = VideoPlayerController.networkUrl(Uri.parse(url));
        await _vpCtrl!.initialize();
        await _vpCtrl!.setLooping(true);
        await _vpCtrl!.play();
      }
    } catch (_) {
      // No stream available
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final live = ref.watch(droneTelemetryProvider(widget.droneId));

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Video feed
            if (_vpCtrl != null && _vpCtrl!.value.isInitialized)
              Center(
                child: AspectRatio(
                  aspectRatio: _vpCtrl!.value.aspectRatio,
                  child: VideoPlayer(_vpCtrl!),
                ),
              )
            else
              Center(
                child: _loading
                    ? const CircularProgressIndicator()
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.videocam_off,
                              size: 64, color: Colors.grey),
                          const SizedBox(height: 16),
                          Text(l10n.fpvStream,
                              style: const TextStyle(color: Colors.grey)),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: _loadRtspUrl,
                            child: Text(l10n.retry),
                          ),
                        ],
                      ),
              ),

            // HUD overlay (top)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withOpacity(0.7),
                      Colors.transparent
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Row(
                  children: [
                    BatteryIndicator(percent: live?.batteryPercent),
                    const SizedBox(width: 12),
                    Text(
                      '${live?.altitudeMeters?.toStringAsFixed(1) ?? '--'} m',
                      style: const TextStyle(
                          color: Colors.white, fontSize: 13),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${live?.speedMps?.toStringAsFixed(1) ?? '--'} m/s',
                      style: const TextStyle(
                          color: Colors.white, fontSize: 13),
                    ),
                    const Spacer(),
                    SignalIndicator(rssi: live?.rssi),
                    const SizedBox(width: 8),
                    Text(
                      '${live?.gpsSatellites ?? '--'} GPS',
                      style: const TextStyle(
                          color: Colors.white, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),

            // Controls (bottom)
            Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Back
                  FloatingActionButton.small(
                    heroTag: 'back',
                    backgroundColor: Colors.black54,
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Icon(Icons.arrow_back),
                  ),
                  const SizedBox(width: 16),
                  // Capture photo
                  FloatingActionButton(
                    heroTag: 'photo',
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    onPressed: _capturePhoto,
                    child: const Icon(Icons.camera_alt),
                  ),
                  const SizedBox(width: 16),
                  // Record
                  FloatingActionButton(
                    heroTag: 'record',
                    backgroundColor:
                        _isRecording ? Colors.red : Colors.red.shade900,
                    onPressed: _toggleRecord,
                    child: Icon(
                        _isRecording ? Icons.stop : Icons.fiber_manual_record),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _capturePhoto() async {
    try {
      final api = ref.read(apiClientProvider);
      await api.dio.post('/fpv-media/capture', data: {'droneId': widget.droneId});
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('拍照成功')));
      }
    } catch (_) {}
  }

  Future<void> _toggleRecord() async {
    try {
      final api = ref.read(apiClientProvider);
      if (_isRecording) {
        await api.dio.post('/fpv-media/stop-record',
            data: {'droneId': widget.droneId});
      } else {
        await api.dio.post('/fpv-media/start-record',
            data: {'droneId': widget.droneId});
      }
      setState(() => _isRecording = !_isRecording);
    } catch (_) {}
  }
}

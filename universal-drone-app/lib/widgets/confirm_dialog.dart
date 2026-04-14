import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';

Future<bool> showConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  String? confirmLabel,
  bool isDangerous = false,
}) async {
  final l10n = AppLocalizations.of(context);
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          style: isDangerous
              ? FilledButton.styleFrom(backgroundColor: Colors.red)
              : null,
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(confirmLabel ?? l10n.confirm),
        ),
      ],
    ),
  );
  return result ?? false;
}

// Emergency stop requires a long-press gesture to avoid accidents
class EmergencyStopButton extends StatefulWidget {
  final VoidCallback onConfirmed;

  const EmergencyStopButton({super.key, required this.onConfirmed});

  @override
  State<EmergencyStopButton> createState() => _EmergencyStopButtonState();
}

class _EmergencyStopButtonState extends State<EmergencyStopButton>
    with SingleTickerProviderStateMixin {
  bool _pressing = false;
  double _progress = 0;
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )
      ..addListener(() {
        setState(() => _progress = _controller.value);
      })
      ..addStatusListener((status) {
        if (status == AnimationStatus.completed) {
          widget.onConfirmed();
          _controller.reset();
          setState(() => _pressing = false);
        }
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return GestureDetector(
      onLongPressStart: (_) {
        setState(() => _pressing = true);
        _controller.forward();
      },
      onLongPressEnd: (_) {
        _controller.reset();
        setState(() {
          _pressing = false;
          _progress = 0;
        });
      },
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: CircularProgressIndicator(
              value: _progress,
              strokeWidth: 5,
              color: Colors.red,
              backgroundColor: Colors.red.withOpacity(0.2),
            ),
          ),
          Container(
            width: 68,
            height: 68,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _pressing ? Colors.red : Colors.red.shade900,
              border: Border.all(color: Colors.red, width: 2),
            ),
            alignment: Alignment.center,
            child: Text(
              l10n.emergencyStop,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

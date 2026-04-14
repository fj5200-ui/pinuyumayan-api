import 'package:flutter/material.dart';

class SignalIndicator extends StatelessWidget {
  final int? rssi;

  const SignalIndicator({super.key, this.rssi});

  @override
  Widget build(BuildContext context) {
    final bars = rssi == null ? 0 : _barsFromRssi(rssi!);
    final color = bars >= 3
        ? Colors.green
        : bars >= 2
            ? Colors.orange
            : Colors.red;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(4, (i) {
        final filled = i < bars;
        return Container(
          width: 4,
          height: 5.0 + i * 3,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          decoration: BoxDecoration(
            color: filled ? color : color.withOpacity(0.25),
            borderRadius: BorderRadius.circular(1),
          ),
        );
      }),
    );
  }

  int _barsFromRssi(int rssi) {
    if (rssi >= -60) return 4;
    if (rssi >= -70) return 3;
    if (rssi >= -80) return 2;
    if (rssi >= -90) return 1;
    return 0;
  }
}

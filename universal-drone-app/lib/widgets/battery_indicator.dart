import 'package:flutter/material.dart';

class BatteryIndicator extends StatelessWidget {
  final int? percent;
  final bool showLabel;

  const BatteryIndicator({super.key, this.percent, this.showLabel = true});

  @override
  Widget build(BuildContext context) {
    final pct = percent ?? 0;
    final color = pct > 50
        ? Colors.green
        : pct > 20
            ? Colors.orange
            : Colors.red;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          alignment: Alignment.centerLeft,
          children: [
            Container(
              width: 22,
              height: 11,
              decoration: BoxDecoration(
                border: Border.all(color: color, width: 1.5),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Positioned(
              left: 2,
              child: Container(
                width: (18 * pct / 100).clamp(0.0, 18.0),
                height: 7,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ),
            Positioned(
              right: -4,
              child: Container(
                width: 3,
                height: 5,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(1),
                    bottomRight: Radius.circular(1),
                  ),
                ),
              ),
            ),
          ],
        ),
        if (showLabel) ...[
          const SizedBox(width: 5),
          Text(
            percent != null ? '$pct%' : '--',
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ],
    );
  }
}

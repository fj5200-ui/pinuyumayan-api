import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/providers/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/map/map_screen.dart';
import 'features/control/control_screen.dart';
import 'features/missions/mission_list_screen.dart';
import 'features/missions/mission_editor_screen.dart';
import 'features/fpv/fpv_screen.dart';
import 'features/alerts/alerts_screen.dart';
import 'features/checklist/checklist_screen.dart';
import 'features/fleet/fleet_screen.dart';
import 'features/maintenance/maintenance_screen.dart';
import 'features/weather/weather_screen.dart';
import 'features/flight_logs/flight_log_list.dart';
import 'features/flight_logs/trajectory_replay.dart';
import 'features/settings/settings_screen.dart';
import 'l10n/app_localizations.dart';

final _router = GoRouter(
  initialLocation: '/login',
  redirect: (context, state) {
    // Auth redirect handled in login screen itself
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
        GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
        GoRoute(
          path: '/control/:droneId',
          builder: (_, state) => ControlScreen(
            droneId: int.parse(state.pathParameters['droneId']!),
          ),
        ),
        GoRoute(
          path: '/missions',
          builder: (_, __) => const MissionListScreen(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (_, __) => const MissionEditorScreen(),
            ),
            GoRoute(
              path: ':id/edit',
              builder: (_, state) => MissionEditorScreen(
                missionId: int.parse(state.pathParameters['id']!),
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/fpv/:droneId',
          builder: (_, state) => FpvScreen(
            droneId: int.parse(state.pathParameters['droneId']!),
          ),
        ),
        GoRoute(path: '/alerts', builder: (_, __) => const AlertsScreen()),
        GoRoute(path: '/checklist', builder: (_, __) => const ChecklistScreen()),
        GoRoute(path: '/fleet', builder: (_, __) => const FleetScreen()),
        GoRoute(path: '/maintenance', builder: (_, __) => const MaintenanceScreen()),
        GoRoute(path: '/weather', builder: (_, __) => const WeatherScreen()),
        GoRoute(
          path: '/flight-logs',
          builder: (_, __) => const FlightLogListScreen(),
          routes: [
            GoRoute(
              path: ':id/replay',
              builder: (_, state) => TrajectoryReplayScreen(
                logId: int.parse(state.pathParameters['id']!),
              ),
            ),
          ],
        ),
        GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      ],
    ),
  ],
);

class DroneApp extends StatelessWidget {
  const DroneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: '通用無人機操作平台',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(),
      darkTheme: _buildDarkTheme(),
      themeMode: ThemeMode.dark,
      routerConfig: _router,
      locale: const Locale('zh', 'TW'),
      supportedLocales: const [Locale('zh', 'TW')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF1565C0),
        brightness: Brightness.light,
      ),
      fontFamily: 'NotoSansTC',
    );
  }

  ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF1565C0),
        brightness: Brightness.dark,
      ),
      fontFamily: 'NotoSansTC',
      scaffoldBackgroundColor: const Color(0xFF0D1117),
      cardColor: const Color(0xFF161B22),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF161B22),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      navigationRailTheme: const NavigationRailThemeData(
        backgroundColor: Color(0xFF161B22),
      ),
    );
  }
}

class MainShell extends ConsumerWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;

    return Scaffold(
      body: Row(
        children: [
          _buildNavRail(context, location),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(child: child),
        ],
      ),
    );
  }

  Widget _buildNavRail(BuildContext context, String location) {
    final destinations = [
      (path: '/dashboard', icon: Icons.dashboard_outlined, label: '儀表板'),
      (path: '/map', icon: Icons.map_outlined, label: '地圖'),
      (path: '/missions', icon: Icons.route_outlined, label: '任務'),
      (path: '/alerts', icon: Icons.notifications_outlined, label: '告警'),
      (path: '/flight-logs', icon: Icons.history_outlined, label: '紀錄'),
      (path: '/checklist', icon: Icons.checklist_outlined, label: '飛前檢查'),
      (path: '/fleet', icon: Icons.group_work_outlined, label: '編隊'),
      (path: '/maintenance', icon: Icons.build_outlined, label: '維修'),
      (path: '/weather', icon: Icons.cloud_outlined, label: '天氣'),
      (path: '/settings', icon: Icons.settings_outlined, label: '設定'),
    ];

    int selectedIndex = destinations
        .indexWhere((d) => location.startsWith(d.path));
    if (selectedIndex < 0) selectedIndex = 0;

    return NavigationRail(
      extended: false,
      selectedIndex: selectedIndex,
      onDestinationSelected: (i) => context.go(destinations[i].path),
      destinations: destinations
          .map((d) => NavigationRailDestination(
                icon: Icon(d.icon),
                label: Text(d.label),
              ))
          .toList(),
    );
  }
}

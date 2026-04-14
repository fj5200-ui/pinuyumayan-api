import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static final Map<String, Map<String, String>> _localizedValues = {
    'zh_TW': {
      'appTitle': '通用無人機操作平台',
      'login': '登入',
      'logout': '登出',
      'email': '電子郵件',
      'password': '密碼',
      'name': '姓名',
      'register': '註冊',
      'dashboard': '儀表板',
      'map': '地圖',
      'control': '控制',
      'missions': '任務',
      'flightLogs': '飛行紀錄',
      'alerts': '告警',
      'checklist': '飛前檢查',
      'fleet': '編隊',
      'maintenance': '維修保養',
      'weather': '天氣',
      'settings': '設定',
      'drones': '無人機',
      'addDrone': '新增無人機',
      'droneStatus_idle': '待機',
      'droneStatus_preflight': '飛前準備',
      'droneStatus_flying': '飛行中',
      'droneStatus_returning': '返航中',
      'droneStatus_error': '異常',
      'droneStatus_maintenance': '維修中',
      'droneStatus_offline': '離線',
      'takeoff': '起飛',
      'land': '降落',
      'returnHome': '返航',
      'hover': '懸停',
      'emergencyStop': '緊急停止',
      'emergencyStopConfirm': '確定要執行緊急停止嗎？',
      'confirm': '確認',
      'cancel': '取消',
      'battery': '電池',
      'altitude': '高度',
      'speed': '速度',
      'gps': 'GPS',
      'signal': '訊號',
      'flightMode': '飛行模式',
      'latitude': '緯度',
      'longitude': '經度',
      'missionName': '任務名稱',
      'createMission': '建立任務',
      'startMission': '開始任務',
      'abortMission': '中止任務',
      'addWaypoint': '新增航點',
      'geofenceViolation': '地理圍欄衝突',
      'alertLowBattery': '電池電量低',
      'alertLostConnection': '訊號失聯',
      'alertGeofenceBreach': '地理圍欄穿越',
      'alertGpsAnomaly': 'GPS 訊號異常',
      'alertMotorError': '馬達異常',
      'alertHighWind': '強風警告',
      'severityCritical': '緊急',
      'severityWarning': '警告',
      'severityInfo': '通知',
      'resolve': '標記已解決',
      'preflightCheck': '飛前檢查',
      'runChecklist': '一鍵飛前檢查',
      'allPassed': '全部通過 ✓',
      'checklistFailed': '有項目未通過',
      'weatherRiskLow': '低風險 — 可以飛行',
      'weatherRiskMedium': '中風險 — 謹慎飛行',
      'weatherRiskHigh': '高風險 — 不建議飛行',
      'windSpeed': '風速',
      'visibility': '能見度',
      'precipitation': '降雨量',
      'temperature': '氣溫',
      'mapSource': '地圖來源',
      'mapSourceOsm': 'OpenStreetMap',
      'mapSourceGoogle': 'Google Maps',
      'mapSourceMapbox': 'Mapbox',
      'offlineMode': '離線模式',
      'serverUrl': '伺服器位址',
      'connected': '已連線',
      'disconnected': '已斷線',
      'connecting': '連線中...',
      'reconnecting': '重新連線中...',
      'save': '儲存',
      'delete': '刪除',
      'edit': '編輯',
      'loading': '載入中...',
      'noData': '尚無資料',
      'error': '發生錯誤',
      'retry': '重試',
      'fpvStream': '即時圖傳',
      'capturePhoto': '拍照',
      'startRecord': '開始錄影',
      'stopRecord': '停止錄影',
      'gimbal': '雲台',
      'camera': '相機',
      'joystick': '搖桿',
      'trajectoryReplay': '軌跡回放',
      'flightDuration': '飛行時間',
      'maxAltitude': '最高高度',
      'maxSpeed': '最高速度',
      'distance': '飛行距離',
      'cycleCount': '循環次數',
      'healthPercent': '健康度',
      'maintenanceType': '保養類型',
      'serialNumber': '序號',
      'brand': '品牌',
      'model': '型號',
      'firmware': '韌體版本',
      'fleetGroup': '編隊群組',
      'masterDrone': '主控機',
      'follower': '跟隨機',
      'export': '匯出',
      'exportFormat': '匯出格式',
      'airspaceCheck': '空域檢查',
      'airspaceSafe': '空域安全',
      'airspaceRestricted': '有空域限制',
      'role_admin': '管理員',
      'role_operator': '操作員',
      'role_observer': '觀察員',
    }
  };

  String get(String key) {
    final langKey = '${locale.languageCode}_${locale.countryCode}';
    return _localizedValues[langKey]?[key] ?? key;
  }

  // Shorthand getters
  String get appTitle => get('appTitle');
  String get login => get('login');
  String get logout => get('logout');
  String get email => get('email');
  String get password => get('password');
  String get name => get('name');
  String get register => get('register');
  String get dashboard => get('dashboard');
  String get map => get('map');
  String get control => get('control');
  String get missions => get('missions');
  String get flightLogs => get('flightLogs');
  String get alerts => get('alerts');
  String get checklist => get('checklist');
  String get fleet => get('fleet');
  String get maintenance => get('maintenance');
  String get weather => get('weather');
  String get settings => get('settings');
  String get drones => get('drones');
  String get addDrone => get('addDrone');
  String get takeoff => get('takeoff');
  String get land => get('land');
  String get returnHome => get('returnHome');
  String get hover => get('hover');
  String get emergencyStop => get('emergencyStop');
  String get emergencyStopConfirm => get('emergencyStopConfirm');
  String get confirm => get('confirm');
  String get cancel => get('cancel');
  String get battery => get('battery');
  String get altitude => get('altitude');
  String get speed => get('speed');
  String get gps => get('gps');
  String get signal => get('signal');
  String get flightMode => get('flightMode');
  String get latitude => get('latitude');
  String get longitude => get('longitude');
  String get missionName => get('missionName');
  String get createMission => get('createMission');
  String get startMission => get('startMission');
  String get abortMission => get('abortMission');
  String get addWaypoint => get('addWaypoint');
  String get resolve => get('resolve');
  String get preflightCheck => get('preflightCheck');
  String get runChecklist => get('runChecklist');
  String get allPassed => get('allPassed');
  String get checklistFailed => get('checklistFailed');
  String get windSpeed => get('windSpeed');
  String get visibility => get('visibility');
  String get precipitation => get('precipitation');
  String get temperature => get('temperature');
  String get mapSource => get('mapSource');
  String get offlineMode => get('offlineMode');
  String get serverUrl => get('serverUrl');
  String get connected => get('connected');
  String get disconnected => get('disconnected');
  String get connecting => get('connecting');
  String get reconnecting => get('reconnecting');
  String get save => get('save');
  String get delete => get('delete');
  String get edit => get('edit');
  String get loading => get('loading');
  String get noData => get('noData');
  String get error => get('error');
  String get retry => get('retry');
  String get fpvStream => get('fpvStream');
  String get capturePhoto => get('capturePhoto');
  String get startRecord => get('startRecord');
  String get stopRecord => get('stopRecord');
  String get gimbal => get('gimbal');
  String get camera => get('camera');
  String get joystick => get('joystick');
  String get trajectoryReplay => get('trajectoryReplay');
  String get flightDuration => get('flightDuration');
  String get maxAltitude => get('maxAltitude');
  String get maxSpeed => get('maxSpeed');
  String get distance => get('distance');
  String get serialNumber => get('serialNumber');
  String get brand => get('brand');
  String get model => get('model');
  String get firmware => get('firmware');
  String get fleetGroup => get('fleetGroup');
  String get masterDrone => get('masterDrone');
  String get follower => get('follower');
  String get exportLabel => get('export');
  String get exportFormat => get('exportFormat');
  String get airspaceCheck => get('airspaceCheck');
  String get airspaceSafe => get('airspaceSafe');
  String get airspaceRestricted => get('airspaceRestricted');

  String droneStatus(String status) => get('droneStatus_$status');
  String alertType(String type) => get('alert${_capitalize(type)}');
  String severity(String level) => get('severity${_capitalize(level)}');
  String role(String r) => get('role_$r');

  String waypointCount(int count) => '$count 個航點';
  String onlineDrones(int count) => '線上：$count 台';

  String weatherRisk(int score) {
    if (score < 30) return get('weatherRiskLow');
    if (score < 70) return get('weatherRiskMedium');
    return get('weatherRiskHigh');
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'zh';

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(AppLocalizations(locale));
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

const _kDefaultBaseUrl = 'http://localhost:3000/api';
const _kTokenKey = 'access_token';
const _kServerUrlKey = 'server_url';

final _storage = FlutterSecureStorage();

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.addAll([
      _AuthInterceptor(),
      PrettyDioLogger(
        requestHeader: false,
        requestBody: true,
        responseBody: false,
        error: true,
        compact: true,
      ),
    ]);
  }

  Future<void> setBaseUrl(String url) async {
    await _storage.write(key: _kServerUrlKey, value: url);
    _dio.options.baseUrl = '${url.replaceAll(RegExp(r'/$'), '')}/api';
  }

  Future<void> _initBaseUrl() async {
    final saved = await _storage.read(key: _kServerUrlKey);
    _dio.options.baseUrl = saved != null
        ? '${saved.replaceAll(RegExp(r'/$'), '')}/api'
        : _kDefaultBaseUrl;
  }

  Dio get dio => _dio;

  // Auth
  Future<Map<String, dynamic>> login(String email, String password) async {
    await _initBaseUrl();
    final res = await _dio
        .post('/auth/login', data: {'email': email, 'password': password});
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> register(
      String email, String password, String name, String role) async {
    await _initBaseUrl();
    final res = await _dio.post('/auth/register',
        data: {'email': email, 'password': password, 'name': name, 'role': role});
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getMe() async {
    await _initBaseUrl();
    final res = await _dio.get('/auth/me');
    return res.data as Map<String, dynamic>;
  }

  // Drones
  Future<List<dynamic>> getDrones() async {
    await _initBaseUrl();
    final res = await _dio.get('/drones');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getDrone(int id) async {
    await _initBaseUrl();
    final res = await _dio.get('/drones/$id');
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createDrone(Map<String, dynamic> data) async {
    await _initBaseUrl();
    final res = await _dio.post('/drones', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateDrone(
      int id, Map<String, dynamic> data) async {
    await _initBaseUrl();
    final res = await _dio.patch('/drones/$id', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<void> deleteDrone(int id) async {
    await _initBaseUrl();
    await _dio.delete('/drones/$id');
  }

  // Missions
  Future<List<dynamic>> getMissions({int? droneId}) async {
    await _initBaseUrl();
    final res = await _dio.get('/missions',
        queryParameters: droneId != null ? {'droneId': droneId} : null);
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getMission(int id) async {
    await _initBaseUrl();
    final res = await _dio.get('/missions/$id');
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createMission(Map<String, dynamic> data) async {
    await _initBaseUrl();
    final res = await _dio.post('/missions', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<void> startMission(int id) async {
    await _initBaseUrl();
    await _dio.post('/missions/$id/start');
  }

  Future<void> abortMission(int id) async {
    await _initBaseUrl();
    await _dio.post('/missions/$id/abort');
  }

  Future<Map<String, dynamic>> addWaypoint(
      int missionId, Map<String, dynamic> data) async {
    await _initBaseUrl();
    final res = await _dio.post('/missions/$missionId/waypoints', data: data);
    return res.data as Map<String, dynamic>;
  }

  // Flight Logs
  Future<List<dynamic>> getFlightLogs({int? droneId}) async {
    await _initBaseUrl();
    final res = await _dio.get('/flight-logs',
        queryParameters: droneId != null ? {'droneId': droneId} : null);
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getFlightLog(int id) async {
    await _initBaseUrl();
    final res = await _dio.get('/flight-logs/$id');
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getTrajectory(int id) async {
    await _initBaseUrl();
    final res = await _dio.get('/flight-logs/$id/trajectory');
    return res.data as Map<String, dynamic>;
  }

  // Alerts
  Future<List<dynamic>> getAlerts({int? droneId, bool? unresolved}) async {
    await _initBaseUrl();
    final res = await _dio.get('/alerts', queryParameters: {
      if (droneId != null) 'droneId': droneId,
      if (unresolved == true) 'unresolved': true,
    });
    return res.data as List<dynamic>;
  }

  Future<void> resolveAlert(int id) async {
    await _initBaseUrl();
    await _dio.patch('/alerts/$id/resolve');
  }

  // Connections
  Future<Map<String, dynamic>> connect(Map<String, dynamic> data) async {
    await _initBaseUrl();
    final res = await _dio.post('/connections/connect', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<void> disconnect(int droneId) async {
    await _initBaseUrl();
    await _dio.post('/connections/$droneId/disconnect');
  }

  Future<Map<String, dynamic>> getConnectionStatus(int droneId) async {
    await _initBaseUrl();
    final res = await _dio.get('/connections/$droneId/status');
    return res.data as Map<String, dynamic>;
  }

  // Fleet
  Future<List<dynamic>> getFleetGroups() async {
    await _initBaseUrl();
    final res = await _dio.get('/fleet');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getFleetStatus(int groupId) async {
    await _initBaseUrl();
    final res = await _dio.get('/fleet/$groupId/status');
    return res.data as Map<String, dynamic>;
  }

  // Checklist
  Future<List<dynamic>> getChecklistTemplates() async {
    await _initBaseUrl();
    final res = await _dio.get('/checklist/templates');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> runChecklist(
      int templateId, int droneId) async {
    await _initBaseUrl();
    final res = await _dio.post('/checklist/run',
        data: {'templateId': templateId, 'droneId': droneId});
    return res.data as Map<String, dynamic>;
  }

  // Maintenance
  Future<List<dynamic>> getMaintenanceRecords(int droneId) async {
    await _initBaseUrl();
    final res = await _dio.get('/maintenance', queryParameters: {'droneId': droneId});
    return res.data as List<dynamic>;
  }

  Future<List<dynamic>> getBatteries({int? droneId}) async {
    await _initBaseUrl();
    final res = await _dio.get('/maintenance/batteries',
        queryParameters: droneId != null ? {'droneId': droneId} : null);
    return res.data as List<dynamic>;
  }

  // Weather
  Future<Map<String, dynamic>> getWeather(
      double lat, double lon) async {
    await _initBaseUrl();
    final res = await _dio
        .get('/weather', queryParameters: {'lat': lat, 'lon': lon});
    return res.data as Map<String, dynamic>;
  }

  // Airspace
  Future<Map<String, dynamic>> checkAirspace(double lat, double lon) async {
    await _initBaseUrl();
    final res = await _dio
        .get('/airspace/check', queryParameters: {'lat': lat, 'lon': lon});
    return res.data as Map<String, dynamic>;
  }

  // Geofences
  Future<List<dynamic>> getGeofences() async {
    await _initBaseUrl();
    final res = await _dio.get('/geofencing');
    return res.data as List<dynamic>;
  }

  // Export
  Future<Map<String, dynamic>> createExportJob(
      Map<String, dynamic> data) async {
    await _initBaseUrl();
    final res = await _dio.post('/export', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getExportJob(int id) async {
    await _initBaseUrl();
    final res = await _dio.get('/export/$id');
    return res.data as Map<String, dynamic>;
  }
}

class _AuthInterceptor extends Interceptor {
  final _storage = const FlutterSecureStorage();

  @override
  Future<void> onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.read(key: _kTokenKey);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    handler.next(err);
  }
}

// Token helpers used by auth provider
Future<void> saveToken(String token) async {
  await _storage.write(key: _kTokenKey, value: token);
}

Future<void> clearToken() async {
  await _storage.delete(key: _kTokenKey);
}

Future<String?> getToken() async {
  return await _storage.read(key: _kTokenKey);
}

Future<String> getServerUrl() async {
  return await _storage.read(key: _kServerUrlKey) ?? 'http://localhost:3000';
}

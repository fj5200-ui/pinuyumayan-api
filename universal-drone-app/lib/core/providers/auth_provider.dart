import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/user.dart';

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  bool get isLoggedIn => user != null;

  AuthState copyWith({User? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;

  AuthNotifier(this._api) : super(const AuthState()) {
    _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    final token = await getToken();
    if (token == null) return;
    try {
      final data = await _api.getMe();
      state = AuthState(user: User.fromJson(data));
    } catch (_) {
      await clearToken();
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _api.login(email, password);
      final tokens = AuthTokens.fromJson(data);
      await saveToken(tokens.accessToken);
      state = AuthState(user: tokens.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> register(
      String email, String password, String name, String role) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _api.register(email, password, name, role);
      final tokens = AuthTokens.fromJson(data);
      await saveToken(tokens.accessToken);
      state = AuthState(user: tokens.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await clearToken();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.read(apiClientProvider);
  return AuthNotifier(api);
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

import 'package:dio/dio.dart';
import 'api_client.dart';

class DooraAuth {
  DooraAuth._();
  static final DooraAuth instance = DooraAuth._();
  final _api = DooraApi.instance;

  Future<Map<String, dynamic>?> restore() async {
    try {
      final user = await _api.getSession();
      return user.isEmpty ? null : user;
    } on DioException {
      return null;
    }
  }

  Future<Map<String, dynamic>> signIn(String email, String password) =>
      _api.signIn(email, password);
  Future<void> signUp(String name, String email, String password) =>
      _api.signUp(name, email, password);
  Future<void> verifyEmail(String email, String otp) =>
      _api.verifyEmail(email, otp);
  Future<void> signOut() => _api.signOut();
}

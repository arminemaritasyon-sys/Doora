import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DooraApi {
  DooraApi._() {
    _dio = Dio(BaseOptions(
      baseUrl: 'https://doora.arminemaritasyon.workers.dev',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Accept': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final raw = await _storage.read(key: _cookieKey);
        if (raw != null && raw.isNotEmpty) {
          final cookies = Map<String, dynamic>.from(jsonDecode(raw));
          if (cookies.isNotEmpty) {
            options.headers['Cookie'] =
                cookies.entries.map((e) => e.key + '=' + e.value.toString()).join('; ');
          }
        }
        handler.next(options);
      },
      onResponse: (response, handler) async {
        await _saveCookies(response.headers);
        handler.next(response);
      },
      onError: (error, handler) async {
        if (error.response != null) await _saveCookies(error.response!.headers);
        handler.next(error);
      },
    ));
  }

  static final DooraApi instance = DooraApi._();
  static const _cookieKey = 'doora_auth_cookies_v1';
  static const _storage = FlutterSecureStorage();
  late final Dio _dio;

  Future<void> _saveCookies(Headers headers) async {
    final values = headers['set-cookie'];
    if (values == null || values.isEmpty) return;
    final raw = await _storage.read(key: _cookieKey);
    final cookies = raw == null
        ? <String, String>{}
        : Map<String, String>.from(jsonDecode(raw) as Map);
    for (final header in values) {
      final pair = header.split(';').first.trim();
      final separator = pair.indexOf('=');
      if (separator <= 0) continue;
      final name = pair.substring(0, separator).trim();
      final value = pair.substring(separator + 1).trim();
      final attributes = header.split(';').skip(1).map((e) => e.trim().toLowerCase());
      final expired = attributes.any((a) =>
          a == 'max-age=0' || a.startsWith('max-age=-') ||
          a.startsWith('expires=thu, 01 jan 1970'));
      if (expired || value.isEmpty) {
        cookies.remove(name);
      } else {
        cookies[name] = value;
      }
    }
    if (cookies.isEmpty) {
      await _storage.delete(key: _cookieKey);
    } else {
      await _storage.write(key: _cookieKey, value: jsonEncode(cookies));
    }
  }

  Future<Map<String, dynamic>> getSession() async {
    final response = await _dio.get('/api/auth/get-session');
    final data = _asMap(response.data);
    return _asMap(data['user']);
  }

  Future<Map<String, dynamic>> signIn(String email, String password) async {
    final response = await _dio.post('/api/auth/sign-in/email', data: {
      'email': email.trim(), 'password': password, 'rememberMe': true,
    });
    final user = _asMap(_asMap(response.data)['user']);
    return user.isNotEmpty ? user : getSession();
  }

  Future<void> signUp(String name, String email, String password) async {
    await _dio.post('/api/auth/sign-up/email', data: {
      'name': name.trim(), 'email': email.trim(), 'password': password,
    });
  }

  Future<void> verifyEmail(String email, String otp) async {
    await _dio.post('/api/auth/email-otp/verify-email', data: {
      'email': email.trim(), 'otp': otp.trim(),
    });
  }

  Future<void> signOut() async {
    try {
      await _dio.post('/api/auth/sign-out');
    } finally {
      await _storage.delete(key: _cookieKey);
    }
  }

  Future<List<Map<String, dynamic>>> getTasks({String? query, String? category}) async {
    final response = await _dio.get('/api/tasks', queryParameters: {
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
      if (category != null && category != 'Tümü') 'category': category,
    });
    final rows = _asMap(response.data)['tasks'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<List<Map<String, dynamic>>> getNearbyTasks() async {
    final response = await _dio.get('/api/tasks/nearby');
    final rows = _asMap(response.data)['tasks'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<Set<String>> getSavedTaskIds() async {
    final response = await _dio.get('/api/saved');
    final rows = _asMap(response.data)['taskIds'];
    if (rows is! List) return <String>{};
    return rows.map((value) => value.toString()).toSet();
  }

  Future<bool> toggleSavedTask(String taskId) async {
    final response = await _dio.post('/api/saved', data: {'taskId': taskId});
    return _asMap(response.data)['saved'] == true;
  }

  Future<Map<String, dynamic>> createTask({
    required String title,
    required String description,
    required String category,
    required num budget,
    required String district,
  }) async {
    final response = await _dio.post('/api/tasks', data: {
      'title': title.trim(),
      'description': description.trim(),
      'category': category,
      'budget': budget,
      'district': district.trim(),
    });
    return _asMap(_asMap(response.data)['task']);
  }

  Future<Map<String, dynamic>> createOffer({
    required String taskId,
    required num amount,
    required String message,
  }) async {
    final response = await _dio.post('/api/offers', data: {
      'taskId': taskId,
      'amount': amount,
      'message': message.trim(),
    });
    return _asMap(_asMap(response.data)['offer']);
  }

  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/api/profile');
    return _asMap(_asMap(response.data)['profile']);
  }

  Future<void> updateProfile({
    required String name,
    required String district,
    required String bio,
  }) async {
    await _dio.patch('/api/profile', data: {
      'name': name.trim(),
      'district': district.trim(),
      'bio': bio.trim(),
      'avatarUrl': '',
      'notifications': {
        'taskUpdates': true,
        'offerUpdates': true,
        'walletUpdates': true,
        'productUpdates': false,
      },
    });
  }

  Future<List<Map<String, dynamic>>> getNotifications() async {
    final response = await _dio.get('/api/notifications');
    final rows = _asMap(response.data)['notifications'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<void> markNotificationsRead() async {
    await _dio.patch('/api/notifications', data: {'all': true});
  }

  String errorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final message = data['message'] ?? data['error'];
        if (message is String && message.isNotEmpty) return message;
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'DOORA sunucusuna bağlanılamadı. İnternet bağlantını kontrol et.';
      }
    }
    return 'İşlem tamamlanamadı. Bilgilerini kontrol edip tekrar dene.';
  }

  Map<String, dynamic> _asMap(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
}

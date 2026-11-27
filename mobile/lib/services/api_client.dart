import 'dart:convert';
import 'dart:math';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DooraApi {
  DooraApi._() {
    _dio = Dio(BaseOptions(
      baseUrl: 'https://doora.arminemaritasyon.workers.dev',
      connectTimeout: const Duration(seconds: 25),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 25),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DOORA-Mobile/2.1.0 (Flutter Android)',
      },
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

  Future<Response<dynamic>> _getWithRetry(
    String path, {Map<String, dynamic>? queryParameters}
  ) async {
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        return await _dio.get(path, queryParameters: queryParameters);
      } on DioException catch (error) {
        final retryable = error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.connectionError;
        if (!retryable || attempt == 1) rethrow;
        await Future<void>.delayed(const Duration(milliseconds: 650));
      }
    }
    throw StateError('DOORA sunucusuna ulaşılamadı.');
  }

  Future<List<Map<String, dynamic>>> getTasks({String? query, String? category, String? city}) async {
    final response = await _getWithRetry('/api/tasks', queryParameters: {
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
      if (category != null && category != 'Tümü') 'category': category,
      if (city != null && city.isNotEmpty && city != 'Tüm Türkiye' && city != 'Tüm Antalya') 'city': city,
    });
    final rows = _asMap(response.data)['tasks'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<List<Map<String, dynamic>>> getMyTasks() async {
    final response = await _dio.get('/api/tasks', queryParameters: {'mine': '1'});
    final rows = _asMap(response.data)['tasks'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<Map<String, dynamic>> manageTask(String taskId, {required String action, String? title, String? description, num? budget, List<String> images = const []}) async {
    final response = await _dio.patch('/api/tasks/$taskId/manage', data: {
      'action': action,
      if (title != null) 'title': title.trim(),
      if (description != null) 'description': description.trim(),
      if (budget != null) 'budget': budget,
      if (images.isNotEmpty) 'images': images,
    });
    return _asMap(_asMap(response.data)['task']);
  }

  Future<List<Map<String, dynamic>>> getNearbyTasks() async {
    final response = await _getWithRetry('/api/tasks/nearby');
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
    String city = 'Antalya',
    List<String> images = const [],
  }) async {
    final response = await _dio.post('/api/tasks', data: {
      'title': title.trim(),
      'description': description.trim(),
      'category': category,
      'budget': budget,
      'district': district.trim(),
      'city': city.trim(),
      if (images.isNotEmpty) 'images': images,
    });
    return _asMap(_asMap(response.data)['task']);
  }

  Future<List<Map<String, dynamic>>> getMyOffers() async {
    final response = await _dio.get('/api/offers');
    final rows = _asMap(response.data)['offers'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<List<Map<String, dynamic>>> getMyIncomingOffers() async {
    final response = await _dio.get('/api/offers', queryParameters: {'incoming': '1'});
    final rows = _asMap(response.data)['offers'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<void> respondToOffer({required String offerId, required String action}) async {
    if (action == 'accept') {
      await _dio.post('/api/offers/$offerId/accept');
    } else if (action == 'reject') {
      await _dio.post('/api/offers/$offerId/reject', data: {'reason': ''});
    } else {
      throw ArgumentError.value(action, 'action', 'Desteklenmeyen teklif işlemi');
    }
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

  Future<Map<String, dynamic>> getPublicProfile(String userId) async {
    final response = await _dio.get('/api/profile', queryParameters: {'userId': userId});
    return _asMap(_asMap(response.data)['profile']);
  }

  Future<void> submitReview({required String taskId, required int rating, required String comment}) async {
    await _dio.post('/api/reviews', data: {
      'taskId': taskId,
      'rating': rating,
      'comment': comment.trim(),
    });
  }

  Future<Map<String, dynamic>> getProviderReviews(String userId) async {
    final response = await _dio.get('/api/reviews', queryParameters: {'userId': userId});
    final data = _asMap(response.data);
    final rows = data['reviews'];
    return {
      'summary': _asMap(data['summary']),
      'reviews': rows is List
          ? rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
          : <Map<String, dynamic>>[],
    };
  }

  Future<void> updateProfile({
    required String name,
    required String district,
    required String bio,
    Map<String, dynamic>? notifications,
  }) async {
    await _dio.patch('/api/profile', data: {
      'name': name.trim(),
      'district': district.trim(),
      'bio': bio.trim(),
      'avatarUrl': '',
      'notifications': notifications ?? {
        'taskUpdates': true,
        'offerUpdates': true,
        'walletUpdates': true,
        'productUpdates': false,
      },
    });
  }

  Future<List<Map<String, dynamic>>> getPortfolio(String userId) async {
    final response = await _dio.get('/api/portfolio', queryParameters: {'userId': userId});
    final rows = _asMap(response.data)['items'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<void> addPortfolioItem({
    required String title,
    required String description,
    required String imageData,
  }) async {
    await _dio.post('/api/portfolio', data: {
      'title': title.trim(),
      'description': description.trim(),
      'imageData': imageData,
    });
  }

  Future<void> deletePortfolioItem(String id) async {
    await _dio.delete('/api/portfolio', queryParameters: {'id': id});
  }

  Future<Map<String, dynamic>> promoteTask(String taskId, String idempotencyKey) async {\n    final response = await _dio.post('/api/tasks/$taskId/feature', data: {'idempotencyKey': idempotencyKey});\n    return _asMap(response.data);\n  }\n\n  Future<Map<String, dynamic>> getWallet() async {
    final response = await _dio.get('/api/wallet');
    final data = _asMap(response.data);
    if (data['account'] is! Map) {
      throw StateError(data['error']?.toString() ?? 'Cüzdan verileri alınamadı.');
    }
    return data;
  }

  String _uuidV4() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  Future<Map<String, dynamic>> walletAction({
    required String action,
    required num amount,
    String iban = '',
  }) async {
    final payload = <String, dynamic>{'action': action, 'amount': amount};
    if (action == 'test_topup') {
      payload['idempotencyKey'] = _uuidV4();
    } else if (action == 'withdraw') {
      payload['iban'] = iban.replaceAll(RegExp(r'\s'), '').toUpperCase();
    } else {
      throw ArgumentError.value(action, 'action', 'Desteklenmeyen cüzdan işlemi');
    }
    final response = await _dio.post('/api/wallet', data: payload);
    return _asMap(response.data);
  }

  Future<List<Map<String, dynamic>>> getConversations() async {
    final response = await _dio.get('/api/messages');
    final rows = _asMap(response.data)['conversations'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<Map<String, dynamic>> getConversation(String peerId, {String? taskId, bool includePeer = false}) async {
    final response = await _dio.get('/api/messages', queryParameters: {
      'peerId': peerId,
      if (taskId != null && taskId.isNotEmpty) 'taskId': taskId,
      if (includePeer) 'includePeer': '1',
    });
    final data = _asMap(response.data);
    final rows = data['messages'];
    return {
      'peer': _asMap(data['peer']),
      'messages': rows is List
          ? rows.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
          : <Map<String, dynamic>>[],
    };
  }

  Future<void> deleteConversation(String peerId, {String? taskId}) async {
    await _dio.delete('/api/messages', data: {
      'peerId': peerId,
      if (taskId != null && taskId.isNotEmpty) 'taskId': taskId,
    });
  }

  Future<void> blockUser(String userId) async {
    await _dio.post('/api/safety', data: {'action': 'block', 'userId': userId});
  }

  Future<void> reportUser(String userId, {required String category, String details = ''}) async {
    await _dio.post('/api/safety', data: {
      'action': 'report',
      'userId': userId,
      'category': category,
      'details': details,
    });
  }

  Future<void> sendMessage(String recipientId, String message, {String? taskId}) async {
    await _dio.post('/api/messages', data: {
      'recipientId': recipientId,
      'message': message.trim(),
      if (taskId != null && taskId.isNotEmpty) 'taskId': taskId,
    });
  }

  Future<int> getUnreadMessageCount() async {
    final rows = await getConversations();
    return rows.fold<int>(0, (total, row) =>
      total + (int.tryParse(row['unread_count']?.toString() ?? '') ?? 0));
  }

  Future<List<Map<String, dynamic>>> getNotifications() async {
    final response = await _dio.get('/api/notifications');
    final rows = _asMap(response.data)['notifications'];
    if (rows is! List) return [];
    return rows.whereType<Map>().map((e) {
      final item = Map<String, dynamic>.from(e);
      // The website API calls the notification body "body"; keep the mobile
      // presentation contract stable and show the actual server text.
      item['message'] = item['body']?.toString() ?? item['message']?.toString() ?? '';
      return item;
    }).toList();
  }

  Future<int> getUnreadNotificationCount() async {
    final response = await _dio.get('/api/notifications');
    final value = _asMap(response.data)['unreadCount'];
    return value is num ? value.toInt() : int.tryParse(value?.toString() ?? '') ?? 0;
  }

  Future<void> markNotificationRead(String id) async {
    await _dio.patch('/api/notifications', data: {'id': id});
  }

  Future<void> markNotificationsRead() async {
    await _dio.patch('/api/notifications', data: {'all': true});
  }

  String absoluteUrl(String path) {
    final uri = Uri.parse(path);
    return uri.hasScheme ? path : _dio.options.baseUrl + (path.startsWith('/') ? path : '/$path');
  }

  String errorMessage(Object error) {
    if (error is DioException) {
      final path = error.requestOptions.path.toLowerCase();
      final data = error.response?.data;
      final raw = data is Map ? (data['message'] ?? data['error'] ?? data['code']) : null;
      final message = raw?.toString().trim() ?? '';
      final normalized = message.toLowerCase();
      if (path.contains('sign-in') || path.contains('login')) {
        if (error.response?.statusCode == 401 || normalized.contains('invalid') ||
            normalized.contains('password') || normalized.contains('credential')) {
          return 'E-posta adresi veya şifre hatalı. Bilgilerini kontrol et.';
        }
      }
      if (error.response?.statusCode == 409 ||
          normalized.contains('already exists') || normalized.contains('already registered')) {
        return 'Bu e-posta adresiyle daha önce hesap oluşturulmuş.';
      }
      if (normalized.contains('invalid email')) return 'Geçerli bir e-posta adresi gir.';
      if (normalized.contains('password') && normalized.contains('length')) return 'Şifren en az 8 karakter olmalı.';
      if (normalized.contains('too many')) return 'Çok fazla deneme yaptın. Biraz bekleyip tekrar dene.';
      if (error.response?.statusCode == 401) return 'Oturumun sona ermiş. Yeniden giriş yap.';
      if (error.response?.statusCode == 403) return 'Bu işlem için yetkin bulunmuyor.';
      if (error.response?.statusCode == 404) return 'Aradığın kayıt bulunamadı.';
      if (error.response?.statusCode == 429) return 'Çok fazla istek gönderdin. Biraz bekleyip tekrar dene.';
      if (message.isNotEmpty && !normalized.contains('internal_server_error')) return message;
      if (error.type == DioExceptionType.connectionTimeout) {
        return 'DOORA sunucusuna bağlantı zaman aşımına uğradı. İnternetini kontrol edip tekrar dene.';
      }
      if (error.type == DioExceptionType.receiveTimeout) {
        return 'DOORA sunucusu yanıt vermekte gecikiyor. Biraz sonra tekrar dene.';
      }
      if (error.type == DioExceptionType.connectionError ||
          error.error is SocketException) {
        return 'DOORA sunucusuna ulaşılamıyor. İnternet bağlantını kontrol et; sorun sürerse sunucu adresi veya yayın durumu kontrol edilmeli.';
      }
    }
    return 'İşlem tamamlanamadı. Bilgilerini kontrol edip tekrar dene.';
  }

  Map<String, dynamic> _asMap(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
}

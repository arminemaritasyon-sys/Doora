import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api_client.dart';

class DooraPushNotifications {
  DooraPushNotifications._();
  static void Function(RemoteMessage message)? onForegroundMessage;
  static void Function(RemoteMessage message)? onNotificationOpened;
  static void Function(String status)? onStatus;
  static String lastStatus = 'Henüz kontrol edilmedi';
  static String? _activeToken;
  static bool _initializing = false;
  static const String _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const String _appId = String.fromEnvironment('FIREBASE_APP_ID');
  static const String _senderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const String _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

  static void _report(String value) { lastStatus = value; debugPrint('[DOORA PUSH] $value'); onStatus?.call(value); }

  static Future<void> initialize(String userId) async {
    if (_initializing) return;
    _initializing = true;
    try {
      if (userId.isEmpty) { _report('Bildirim kurulamadı: kullanıcı oturumu bulunamadı.'); return; }
      if (!isConfigured) { _report('Firebase yapılandırması eksik. APK Firebase ayarları olmadan derlenmiş.'); return; }
      _report('Firebase başlatılıyor…');
      if (Firebase.apps.isEmpty) { await Firebase.initializeApp(options: const FirebaseOptions(apiKey: _apiKey, appId: _appId, messagingSenderId: _senderId, projectId: _projectId)); }
      final messaging = FirebaseMessaging.instance;
      final permission = await messaging.requestPermission(alert: true, badge: true, sound: true, provisional: false);
      if (permission.authorizationStatus == AuthorizationStatus.denied) { _report('Bildirim izni kapalı. Telefon ayarlarından DOORA bildirimlerini aç.'); return; }
      _report('Firebase cihaz anahtarı alınıyor…');
      final token = await messaging.getToken();
      if (token == null || token.isEmpty) { _report('Firebase cihaz anahtarı üretmedi. Firebase Android yapılandırması kontrol edilmeli.'); return; }
      _activeToken = token;
      _report('Cihaz anahtarı alındı; DOORA hesabına kaydediliyor…');
      await DooraApi.instance.registerPushToken(token, platform: Platform.isIOS ? 'ios' : 'android');
      _report('Bildirimler hazır. Cihaz sunucuya başarıyla kaydedildi.');
      messaging.onTokenRefresh.listen((next) async { _activeToken = next; try { await DooraApi.instance.registerPushToken(next, platform: Platform.isIOS ? 'ios' : 'android'); _report('Bildirim cihaz anahtarı yenilendi ve kaydedildi.'); } catch (error, stack) { debugPrint('[DOORA PUSH] token refresh failed: $error\n$stack'); _report(_apiError('Cihaz anahtarı yenilenemedi', error)); } });
      FirebaseMessaging.onMessage.listen((message) => onForegroundMessage?.call(message));
      FirebaseMessaging.onMessageOpenedApp.listen((message) => onNotificationOpened?.call(message));
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) onNotificationOpened?.call(initialMessage);
    } catch (error, stack) { debugPrint('[DOORA PUSH] initialize failed: $error\n$stack'); _report(_apiError('Bildirim kurulumu başarısız', error)); }
    finally { _initializing = false; }
  }

  static String _apiError(String prefix, Object error) {
    if (error is DioException) {
      final code = error.response?.statusCode; final data = error.response?.data;
      if (code != null) { final detail = data is Map ? (data['error'] ?? data['message'] ?? 'Sunucu isteği reddetti.') : 'Sunucu isteği reddetti.'; return '$prefix (HTTP $code): $detail'; }
      return '$prefix: Ağ bağlantısı kurulamadı (${error.message ?? error.type.name}).';
    }
    return '$prefix: ${error.runtimeType}. Ayrıntı günlük kaydına yazıldı.';
  }

  static Future<void> dispose() async { final token = _activeToken; _activeToken = null; if (token != null) { try { await DooraApi.instance.unregisterPushToken(token); } catch (_) {} } }
  static bool get isConfigured => _apiKey.isNotEmpty && _appId.isNotEmpty && _senderId.isNotEmpty && _projectId.isNotEmpty;
}
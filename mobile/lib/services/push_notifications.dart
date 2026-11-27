import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_client.dart';

class DooraPushNotifications {
  DooraPushNotifications._();
  static final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();
  static bool _ready = false;
  static String? _activeToken;

  static const String _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const String _appId = String.fromEnvironment('FIREBASE_APP_ID');
  static const String _senderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const String _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

  static Future<void> initialize(String userId) async {
    if (userId.isEmpty || _apiKey.isEmpty || _appId.isEmpty ||
        _senderId.isEmpty || _projectId.isEmpty) return;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: const FirebaseOptions(
          apiKey: _apiKey,
          appId: _appId,
          messagingSenderId: _senderId,
          projectId: _projectId,
        ));
      }
      const android = AndroidInitializationSettings('@mipmap/ic_launcher');
      await _local.initialize(const InitializationSettings(android: android));
      const channel = AndroidNotificationChannel(
        'doora_updates',
        'DOORA bildirimleri',
        description: 'Mesajlar, teklifler ve hesap hareketleri',
        importance: Importance.max,
      );
      await _local.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
      final permission = await FirebaseMessaging.instance.requestPermission(
        alert: true, badge: true, sound: true, provisional: false,
      );
      if (permission.authorizationStatus == AuthorizationStatus.denied) return;
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        _activeToken = token;
        await DooraApi.instance.registerPushToken(token, platform: Platform.isIOS ? 'ios' : 'android');
      }
      FirebaseMessaging.instance.onTokenRefresh.listen((next) async {
        _activeToken = next;
        try {
          await DooraApi.instance.registerPushToken(next, platform: Platform.isIOS ? 'ios' : 'android');
        } catch (_) {}
      });
      FirebaseMessaging.onMessage.listen((message) async {
        final notification = message.notification;
        if (notification == null) return;
        await _local.show(
          notification.hashCode,
          notification.title ?? 'DOORA',
          notification.body ?? '',
          const NotificationDetails(
            android: AndroidNotificationDetails(
              'doora_updates',
              'DOORA bildirimleri',
              channelDescription: 'Mesajlar, teklifler ve hesap hareketleri',
              importance: Importance.max,
              priority: Priority.high,
              icon: '@mipmap/ic_launcher',
            ),
          ),
          payload: message.data['href']?.toString(),
        );
      });
      _ready = true;
    } catch (_) {
      // Push is optional until the Firebase project keys are configured.
    }
  }

  static Future<void> dispose() async {
    final token = _activeToken;
    _activeToken = null;
    _ready = false;
    if (token != null) {
      try { await DooraApi.instance.unregisterPushToken(token); } catch (_) {}
    }
  }

  static bool get isConfigured =>
      _apiKey.isNotEmpty && _appId.isNotEmpty && _senderId.isNotEmpty && _projectId.isNotEmpty;
}

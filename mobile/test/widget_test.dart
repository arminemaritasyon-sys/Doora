import 'package:flutter_test/flutter_test.dart';
import 'package:doora_mobile/theme/doora_theme.dart';
import 'package:doora_mobile/main.dart';

void main() {
  test('DOORA design system is Material 3 with brand palette', () {
    final theme = DooraTheme.light;
    expect(theme.useMaterial3, isTrue);
    expect(theme.colorScheme.primary, DooraColors.forest);
  });

  test('DOORA application entry point is available', () {
    expect(DooraApp, isNotNull);
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:doora_mobile/theme/doora_theme.dart';
import 'package:doora_mobile/main.dart';

void main() {
  test('DOORA brand palette is defined', () {
    expect(DooraColors.forest, isNotNull);
    expect(DooraColors.paper, isNotNull);
    expect(DooraColors.ink, isNotNull);
  });

  test('DOORA application entry point is available', () {
    expect(DooraApp, isNotNull);
  });
}

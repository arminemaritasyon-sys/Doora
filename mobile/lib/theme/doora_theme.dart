import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class DooraColors {
  static const ink = Color(0xFF18211E);
  static const forest = Color(0xFF087A50);
  static const green = Color(0xFF10B981);
  static const mint = Color(0xFFDCFCEB);
  static const paper = Color(0xFFF8FAFC);
  static const muted = Color(0xFF7D8983);
  static const line = Color(0xFFE8ECE8);
  static const white = Colors.white;
}

abstract final class DooraTheme {
  static ThemeData get light {
    final base = ThemeData.light();
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: DooraColors.paper,
      colorScheme: ColorScheme.fromSeed(
        seedColor: DooraColors.forest,
        brightness: Brightness.light,
        surface: DooraColors.paper,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme),
      splashFactory: InkSparkle.splashFactory,
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: DooraColors.forest,
        selectionHandleColor: DooraColors.forest,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: DooraColors.paper,
        foregroundColor: DooraColors.ink,
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: DooraColors.white,
        hintStyle: const TextStyle(color: DooraColors.muted, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: DooraColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: DooraColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: DooraColors.green, width: 1.4),
        ),
      ),
    );
  }

  static ThemeData get dark {
    final base = ThemeData.dark();
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF050807),
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF10B981), brightness: Brightness.dark, surface: const Color(0xFF050807)),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme),
      appBarTheme: const AppBarTheme(backgroundColor: Color(0xFF050807), foregroundColor: Colors.white, elevation: 0),
      cardColor: const Color(0xFF101815),
    );
  }
}

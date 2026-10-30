import 'package:flutter/material.dart';

import 'models.dart';

/// Builds the app theme: dark warm background, square corners, thin borders and no shadows.
ThemeData buildLonghouseTheme() {
  const textColor = LonghouseColors.text;
  final base = ThemeData(
    brightness: Brightness.dark,
    fontFamily: LonghouseFonts.body,
    scaffoldBackgroundColor: LonghouseColors.background,
    colorScheme: const ColorScheme.dark(
      surface: LonghouseColors.panel,
      onSurface: textColor,
      primary: LonghouseColors.ember,
      secondary: LonghouseColors.frost,
      outline: LonghouseColors.line,
    ),
    dividerColor: LonghouseColors.line,
    focusColor: LonghouseColors.frost.withValues(alpha: 0.3),
  );
  return base.copyWith(
    textTheme: base.textTheme
        .apply(bodyColor: textColor, displayColor: textColor)
        .copyWith(
          headlineSmall: const TextStyle(
            fontFamily: LonghouseFonts.heading,
            fontSize: 26,
            letterSpacing: 1.5,
            color: textColor,
          ),
          titleSmall: const TextStyle(
            fontFamily: LonghouseFonts.heading,
            fontSize: 15,
            letterSpacing: 1.8,
            color: LonghouseColors.muted,
          ),
          bodySmall: const TextStyle(fontSize: 13, color: LonghouseColors.muted),
        ),
    cardTheme: const CardThemeData(
      color: LonghouseColors.panel,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(side: BorderSide(color: LonghouseColors.line)),
    ),
  );
}

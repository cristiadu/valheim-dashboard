import 'package:flutter/painting.dart';

/// Colors of the Longhouse look.
abstract final class LonghouseColors {
  /// Page background.
  static const background = Color(0xFF17140F);

  /// Panel background.
  static const panel = Color(0xFF211C16);

  /// Background of the selected menu item.
  static const selected = Color(0xFF2A241C);

  /// Borders and dividers.
  static const line = Color(0xFF3A3226);

  /// Main text.
  static const text = Color(0xFFEDE3D1);

  /// Labels and secondary text.
  static const muted = Color(0xFFA99B85);

  /// Main accent: selected rune, links, raids.
  static const ember = Color(0xFFE8873A);

  /// Second accent: joins and keyboard focus.
  static const frost = Color(0xFF8CC3D6);

  /// Server online, world saves.
  static const good = Color(0xFF9DBB86);

  /// Bosses.
  static const gold = Color(0xFFD8B24C);

  /// Deaths.
  static const blood = Color(0xFFE2735A);
}

/// Font families bundled in `assets/fonts`.
abstract final class LonghouseFonts {
  /// Headings.
  static const heading = 'Cinzel';

  /// Body text.
  static const body = 'Barlow';

  /// Times and raw log lines.
  static const mono = 'IBMPlexMono';

  /// Rune icons.
  static const rune = 'NotoSansRunic';
}

/// Spacing in logical pixels.
abstract final class LonghouseSpacing {
  /// Gap between small items.
  static const small = 8.0;

  /// Padding inside panels.
  static const medium = 16.0;

  /// Padding around the page content.
  static const large = 28.0;
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:valheim_dashboard/theme/longhouse_theme.dart';

/// Wraps [child] in the app theme at a window of [size], for widget tests.
Future<void> pumpThemed(WidgetTester tester, Widget child, {Size size = const Size(1280, 800)}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(theme: buildLonghouseTheme(), home: child));
}

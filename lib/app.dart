import 'package:flutter/material.dart';

import 'shell/dashboard_shell.dart';
import 'theme/longhouse_theme.dart';

/// The dashboard app with the Longhouse theme.
class ValheimDashboardApp extends StatelessWidget {
  /// Creates the app.
  const ValheimDashboardApp({super.key});

  /// Builds the app with the dashboard frame as its only page.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Valheim Dashboard',
      debugShowCheckedModeBanner: false,
      theme: buildLonghouseTheme(),
      home: const DashboardShell(),
    );
  }
}

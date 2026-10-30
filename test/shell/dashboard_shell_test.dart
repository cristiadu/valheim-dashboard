import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:valheim_dashboard/shell/dashboard_shell.dart';
import 'package:valheim_dashboard/shell/side_menu.dart';

import '../common.dart';

void main() {
  testWidgets('opens on the Hall tab', (tester) async {
    // GIVEN the dashboard frame
    // WHEN it is shown
    await pumpThemed(tester, const DashboardShell());

    // THEN the Hall page is shown
    expect(find.descendant(of: find.byType(TabPage), matching: find.text('Hall')), findsOneWidget);
  });

  testWidgets('switches tab when a menu item is pressed', (tester) async {
    // GIVEN the dashboard frame
    await pumpThemed(tester, const DashboardShell());

    // WHEN the Saga menu item is pressed
    await tester.tap(find.descendant(of: find.byType(SideMenu), matching: find.text('Saga')));
    await tester.pump();

    // THEN the Saga page is shown
    expect(find.descendant(of: find.byType(TabPage), matching: find.text('Saga')), findsOneWidget);
  });

  testWidgets('puts the menu beside the page on wide windows', (tester) async {
    // GIVEN a wide window
    // WHEN the frame is shown
    await pumpThemed(tester, const DashboardShell());

    // THEN the menu is a column
    expect(find.descendant(of: find.byType(SideMenu), matching: find.byType(Column)), findsWidgets);
    expect(find.descendant(of: find.byType(SideMenu), matching: find.byType(Wrap)), findsNothing);
  });

  testWidgets('puts the menu above the page on narrow windows', (tester) async {
    // GIVEN a phone-sized window
    // WHEN the frame is shown
    await pumpThemed(tester, const DashboardShell(), size: const Size(390, 844));

    // THEN the menu wraps in rows
    expect(find.descendant(of: find.byType(SideMenu), matching: find.byType(Wrap)), findsOneWidget);
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:valheim_dashboard/shell/models.dart';
import 'package:valheim_dashboard/shell/side_menu.dart';

import '../common.dart';

void main() {
  testWidgets('shows every tab with its hint', (tester) async {
    // GIVEN a menu with Hall selected
    // WHEN it is shown
    await pumpThemed(
      tester,
      Scaffold(
        body: SideMenu(selected: DashboardTab.hall, onSelected: (_) {}, isVertical: true),
      ),
    );

    // THEN each tab label and hint is there
    for (final tab in DashboardTab.values) {
      expect(find.text(tab.label), findsOneWidget);
      expect(find.text(tab.hint), findsOneWidget);
    }
  });

  testWidgets('reports the picked tab', (tester) async {
    // GIVEN a menu that records picks
    DashboardTab? picked;
    await pumpThemed(
      tester,
      Scaffold(
        body: SideMenu(selected: DashboardTab.hall, onSelected: (tab) => picked = tab, isVertical: true),
      ),
    );

    // WHEN World is pressed
    await tester.tap(find.text('World'));

    // THEN World is reported
    expect(picked, DashboardTab.world);
  });

  testWidgets('marks only the selected tab as selected', (tester) async {
    // GIVEN a menu with Vikings selected
    // WHEN it is shown
    await pumpThemed(
      tester,
      Scaffold(
        body: SideMenu(selected: DashboardTab.vikings, onSelected: (_) {}, isVertical: true),
      ),
    );

    // THEN one item is marked selected and it is Vikings
    final selected = tester.widgetList<Semantics>(find.byType(Semantics)).where((s) => s.properties.selected == true);
    expect(selected, hasLength(1));
    expect(find.descendant(of: find.byWidget(selected.single), matching: find.text('Vikings')), findsOneWidget);
  });
}

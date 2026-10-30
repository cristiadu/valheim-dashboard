import 'package:flutter/material.dart';

import '../theme/models.dart';
import 'models.dart';
import 'side_menu.dart';

/// Page frame: header, side menu and the selected tab.
class DashboardShell extends StatefulWidget {
  /// Creates the frame, opening on [initialTab].
  const DashboardShell({super.key, this.initialTab = DashboardTab.hall});

  /// Tab shown when the app opens.
  final DashboardTab initialTab;

  /// Creates the state that remembers the selected tab.
  @override
  State<DashboardShell> createState() => _DashboardShellState();
}

/// Holds the selected tab.
class _DashboardShellState extends State<DashboardShell> {
  /// Tab shown now.
  late DashboardTab _selected = widget.initialTab;

  /// Shows [tab].
  void _select(DashboardTab tab) => setState(() => _selected = tab);

  /// Builds the header, then the menu beside the tab, or above it on narrow windows.
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Header(),
            const Divider(height: 1),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) =>
                    constraints.maxWidth < narrowLayoutWidth ? _buildNarrow() : _buildWide(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Menu in a column on the left, tab on the right.
  Widget _buildWide() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          width: sideMenuWidth,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(LonghouseSpacing.medium),
            child: SideMenu(selected: _selected, onSelected: _select, isVertical: true),
          ),
        ),
        const VerticalDivider(width: 1),
        Expanded(child: TabPage(tab: _selected)),
      ],
    );
  }

  /// Menu in a wrapping row on top, tab below.
  Widget _buildNarrow() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.all(LonghouseSpacing.small),
          child: SideMenu(selected: _selected, onSelected: _select, isVertical: false),
        ),
        const Divider(height: 1),
        Expanded(child: TabPage(tab: _selected)),
      ],
    );
  }
}

/// Top bar with the app name.
class _Header extends StatelessWidget {
  /// Creates the header.
  const _Header();

  /// Builds the rune mark and the app name.
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: LonghouseSpacing.large, vertical: 18),
      child: Row(
        spacing: 14,
        children: [
          const ExcludeSemantics(
            child: Text(
              'ᛟ',
              style: TextStyle(fontFamily: LonghouseFonts.rune, fontSize: 24, color: LonghouseColors.ember),
            ),
          ),
          Flexible(
            child: Text(
              'VALHEIM DASHBOARD',
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontFamily: LonghouseFonts.heading, fontWeight: FontWeight.w700, letterSpacing: 3),
            ),
          ),
        ],
      ),
    );
  }
}

/// Content of one tab. Shows the heading and an empty state until the tab gets its data.
class TabPage extends StatelessWidget {
  /// Creates the page for [tab].
  const TabPage({super.key, required this.tab});

  /// Tab this page shows.
  final DashboardTab tab;

  /// Builds the heading and the empty state.
  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.all(LonghouseSpacing.large),
      children: [
        Text(tab.label, style: textTheme.headlineSmall),
        const SizedBox(height: LonghouseSpacing.medium),
        Text('No server log loaded yet.', style: textTheme.bodySmall),
      ],
    );
  }
}

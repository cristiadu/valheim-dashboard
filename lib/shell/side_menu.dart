import 'package:flutter/material.dart';

import '../theme/models.dart';
import 'models.dart';

/// Menu that switches between the dashboard tabs.
class SideMenu extends StatelessWidget {
  /// Creates the menu with the selected tab and a callback for picks.
  const SideMenu({super.key, required this.selected, required this.onSelected, required this.isVertical});

  /// Tab shown now.
  final DashboardTab selected;

  /// Called with the tab the user picked.
  final ValueChanged<DashboardTab> onSelected;

  /// True for a column at the side, false for a wrapping row on top.
  final bool isVertical;

  /// Builds one button per tab.
  @override
  Widget build(BuildContext context) {
    final buttons = [
      for (final tab in DashboardTab.values)
        _MenuButton(tab: tab, isSelected: tab == selected, onPressed: () => onSelected(tab)),
    ];
    if (isVertical) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, spacing: 4, children: buttons);
    }
    return Wrap(spacing: 4, runSpacing: 4, children: buttons);
  }
}

/// One menu button with a rune, label and hint.
class _MenuButton extends StatelessWidget {
  /// Creates the button for [tab].
  const _MenuButton({required this.tab, required this.isSelected, required this.onPressed});

  /// Tab this button opens.
  final DashboardTab tab;

  /// True when [tab] is shown now.
  final bool isSelected;

  /// Called when the button is pressed.
  final VoidCallback onPressed;

  /// Builds the button, highlighted when selected.
  @override
  Widget build(BuildContext context) {
    final borderColor = isSelected ? LonghouseColors.line : Colors.transparent;
    return Semantics(
      selected: isSelected,
      button: true,
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          alignment: Alignment.centerLeft,
          backgroundColor: isSelected ? LonghouseColors.selected : Colors.transparent,
          foregroundColor: LonghouseColors.text,
          shape: RoundedRectangleBorder(side: BorderSide(color: borderColor)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          spacing: 14,
          children: [
            ExcludeSemantics(
              child: Text(
                tab.rune,
                style: TextStyle(
                  fontFamily: LonghouseFonts.rune,
                  fontSize: 20,
                  color: isSelected ? LonghouseColors.ember : LonghouseColors.muted,
                ),
              ),
            ),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tab.label,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontFamily: LonghouseFonts.heading, fontSize: 15, letterSpacing: 1.2),
                  ),
                  Text(
                    tab.hint,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: LonghouseColors.muted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

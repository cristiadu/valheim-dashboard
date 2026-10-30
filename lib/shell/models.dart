/// Width in logical pixels under which the side menu moves above the content.
const narrowLayoutWidth = 720.0;

/// Width of the side menu in logical pixels.
const sideMenuWidth = 220.0;

/// The dashboard tabs, in menu order.
enum DashboardTab {
  /// Today at a glance. The first screen, kept short.
  hall(label: 'Hall', hint: 'Today at a glance', rune: 'ᛟ'),

  /// Who was online and when.
  vikings(label: 'Vikings', hint: 'Who was online', rune: 'ᛗ'),

  /// Every game event, newest first.
  saga(label: 'Saga', hint: 'Every game event', rune: 'ᚱ'),

  /// World saves, backups and boss progress.
  world(label: 'World', hint: 'Saves and bosses', rune: 'ᛃ'),

  /// Server status, uptime and warnings.
  server(label: 'Server', hint: 'Status and warnings', rune: 'ᚾ');

  /// Creates a tab with its menu label, short hint and rune icon.
  const DashboardTab({required this.label, required this.hint, required this.rune});

  /// Name shown in the menu and as the page heading.
  final String label;

  /// Short line under the label in the menu.
  final String hint;

  /// Rune shown as the tab icon.
  final String rune;
}

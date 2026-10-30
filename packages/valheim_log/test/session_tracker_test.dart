import 'package:test/test.dart';
import 'package:valheim_log/valheim_log.dart';

import 'common.dart';

void main() {
  late List<PlayerSession> crossplaySessions;
  late List<PlayerSession> steamOnlySessions;

  setUpAll(() {
    // GIVEN the parsed sample logs
    // WHEN sessions are built from them
    crossplaySessions = sessionsFrom(parseSample(crossplayLog));
    steamOnlySessions = sessionsFrom(parseSample(steamOnlyLog));
  });

  test('links the Steam name and the character into one crossplay session', () {
    // THEN one session holds both names, the start, the end and the death, and the respawn adds none
    final session = crossplaySessions.single;
    expect(
      [session.character, session.steamName, session.steamId, session.peerId],
      ['Ragnar', 'Tony Example', 'Steam_76561198000000001', '549297305'],
    );
    expect(session.startUtc, DateTime.utc(2026, 10, 29, 9, 43, 13));
    expect(session.endUtc, DateTime.utc(2026, 10, 29, 10, 56, 36));
    expect([session.endReason, session.deaths], [SessionEndReason.left, 1]);
  });

  test('ends a Steam-only session at the socket close after a timeout', () {
    // THEN the refused attempt opens no session and the timeout is the end reason
    final session = steamOnlySessions.single;
    expect([session.character, session.steamId, session.steamName], ['Astrid', 'Steam_76561198000000002', null]);
    expect(session.endUtc, DateTime.utc(2023, 5, 20, 11, 10));
    expect(session.endReason, SessionEndReason.timedOut);
  });

  test('keeps a session open while the player is online', () {
    // GIVEN the crossplay log up to the character spawn
    final events = parseSample(crossplayLog).takeWhile((e) => e is! PlayerDiedEvent);

    // WHEN sessions are built from it
    final tracker = SessionTracker();
    events.forEach(tracker.add);

    // THEN the player is online with no end
    final session = tracker.online.single;
    expect([session.character, session.endUtc, session.endReason], ['Ragnar', null, null]);
  });

  test('ends open sessions when the server stops', () {
    // GIVEN the crossplay log without its leave lines
    final events = parseSample(crossplayLog).where((e) => e is! PlayerLeftEvent);

    // WHEN sessions are built from it
    final session = sessionsFrom(events).single;

    // THEN the stop ends the session at the stop time
    expect(
      [session.endUtc, session.endReason],
      [DateTime.utc(2026, 10, 29, 23, 19, 51), SessionEndReason.serverStopped],
    );
  });

  test('ends open sessions as a crash when the caller says the log was replaced', () {
    // GIVEN a tracker with the player online
    final tracker = SessionTracker();
    parseSample(crossplayLog).takeWhile((e) => e is! PlayerDiedEvent).forEach(tracker.add);

    // WHEN the caller ends the run as a crash
    tracker.endAll(DateTime.utc(2026, 10, 29, 12), SessionEndReason.serverCrashed);

    // THEN nobody is online and the session ended as a crash
    expect(tracker.online, isEmpty);
    final session = tracker.sessions.single;
    expect([session.endUtc, session.endReason], [DateTime.utc(2026, 10, 29, 12), SessionEndReason.serverCrashed]);
  });
}

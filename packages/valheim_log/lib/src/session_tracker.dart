import 'models.dart';

/// Builds player sessions from log events, in log order.
///
/// A session starts at a character's first spawn after a handshake and ends when the server removes
/// that connection's objects, a Steam socket closes, or the server stops or restarts.
class SessionTracker {
  /// Every session seen so far, oldest first.
  final List<PlayerSession> sessions = [];

  final Map<String, String> _steamNames = {};
  final Map<String, String> _connectionSteamIds = {};
  String? _lastHandshakeConnectionId;
  bool _isTimeoutPending = false;

  /// Sessions still open, meaning the player is online.
  Iterable<PlayerSession> get online => sessions.where((session) => session.endUtc == null);

  /// Updates the sessions with one [event].
  void add(LogEvent event) {
    switch (event) {
      case KnownPlayerEvent(:final steamId, :final steamName):
        _steamNames[steamId] = steamName;
      case PlayerConnectingEvent(:final connectionId, :final steamId?):
        _connectionSteamIds[connectionId] = steamId;
      case SteamLinkedEvent(:final playFabId, :final steamId):
        _connectionSteamIds[playFabId] = steamId;
      case HandshakeEvent(:final connectionId):
        _lastHandshakeConnectionId = connectionId;
      case CharacterSpawnedEvent(:final character, :final peerId, :final timeUtc):
        if (online.any((session) => session.peerId == peerId)) {
          return;
        }
        final steamId = _connectionSteamIds[_lastHandshakeConnectionId];
        sessions.add(
          PlayerSession(
            character: character,
            peerId: peerId,
            startUtc: timeUtc,
            steamId: steamId,
            steamName: _steamNames[steamId],
          ),
        );
        _lastHandshakeConnectionId = null;
      case PlayerDiedEvent(:final character):
        for (final session in online.where((session) => session.character == character)) {
          session.deaths++;
        }
      case PlayerDisconnectingEvent(:final isTimeout):
        _isTimeoutPending = isTimeout;
      case PlayerLeftEvent(:final peerId, :final timeUtc):
        _endWhere((session) => session.peerId == peerId, timeUtc, _leaveReason());
      case SocketClosedEvent(:final steamId, :final timeUtc):
        _endWhere((session) => session.steamId == steamId, timeUtc, _leaveReason());
      case ServerStoppedEvent(:final timeUtc):
        endAll(timeUtc, SessionEndReason.serverStopped);
      default:
        break;
    }
  }

  /// Ends every online session at [timeUtc] for [reason].
  ///
  /// The server starts a new `logs.txt` on every run. When a new one starts while sessions are still
  /// open, call this with the old log's last time and [SessionEndReason.serverCrashed].
  void endAll(DateTime timeUtc, SessionEndReason reason) => _endWhere((_) => true, timeUtc, reason);

  /// Returns the reason for a leave, using up a pending timeout.
  SessionEndReason _leaveReason() {
    final reason = _isTimeoutPending ? SessionEndReason.timedOut : SessionEndReason.left;
    _isTimeoutPending = false;
    return reason;
  }

  /// Ends every online session that matches [test] at [timeUtc] for [reason].
  void _endWhere(bool Function(PlayerSession) test, DateTime timeUtc, SessionEndReason reason) {
    for (final session in online.where(test).toList()) {
      session
        ..endUtc = timeUtc
        ..endReason = reason;
    }
  }
}

/// Returns the player sessions found in [events].
List<PlayerSession> sessionsFrom(Iterable<LogEvent> events) {
  final tracker = SessionTracker();
  events.forEach(tracker.add);
  return tracker.sessions;
}

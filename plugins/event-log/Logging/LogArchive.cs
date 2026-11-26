using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using BepInEx.Logging;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Keeps a copy of this run's log in the <c>log-history</c> folder next to it, so the run survives the server
    /// writing a new <c>logs.txt</c> on its next start, whether or not the dashboard was running. The dashboard reads
    /// the copies when it starts.
    /// </summary>
    internal static class LogArchive
    {
        /// <summary>Name of the folder next to the server's log that holds one copy per run.</summary>
        private const string FolderName = "log-history";

        /// <summary>File extension of a run's copy.</summary>
        private const string FileExtension = ".txt";

        /// <summary>Milliseconds between copies. A crash loses at most this much of the log's end.</summary>
        private const int CopyIntervalMilliseconds = 5000;

        /// <summary>A line the server stamped with its local time, such as <c>10/30/2026 15:43:44: Valheim version</c>.</summary>
        private static readonly Regex TimestampPattern = new Regex(
            @"^(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{4}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}): ",
            RegexOptions.Compiled);

        /// <summary>Source whose messages reach the server's log through <see cref="ServerLogListener"/>.</summary>
        private static readonly ManualLogSource Log = BepInEx.Logging.Logger.CreateLogSource("Log archive");

        /// <summary>Keeps the timer from being collected.</summary>
        private static System.Threading.Timer timer;

        /// <summary>Makes sure only one copy runs at a time.</summary>
        private static readonly object CopyLock = new object();

        /// <summary>The server's log.</summary>
        private static string logPath;

        /// <summary>This run's copy. Null until the run's first timestamped line names it.</summary>
        private static string copyPath;

        /// <summary>Bytes of the server's log already in <see cref="copyPath"/>.</summary>
        private static long copiedBytes;

        /// <summary>Message of the last failure, so a failure that repeats is logged once.</summary>
        private static string lastFailure;

        /// <summary>Starts copying the server's log every few seconds. Does nothing when the game has no log file.</summary>
        public static void Start()
        {
            logPath = Application.consoleLogPath;
            if (string.IsNullOrEmpty(logPath))
            {
                return;
            }
            timer = new System.Threading.Timer(_ => Copy(), null, 0, CopyIntervalMilliseconds);
        }

        /// <summary>Stops the timer and copies what the server wrote since the last copy.</summary>
        public static void Stop()
        {
            timer?.Dispose();
            timer = null;
            Copy();
        }

        /// <summary>Copies the bytes the server added to its log since the last copy. Logs a failure once, then tries again later.</summary>
        private static void Copy()
        {
            lock (CopyLock)
            {
                try
                {
                    CopyNewBytes();
                    lastFailure = null;
                }
                catch (Exception exception)
                {
                    if (exception.Message != lastFailure)
                    {
                        lastFailure = exception.Message;
                        Log.LogWarning($"Could not copy {logPath} to {FolderName}: {exception.Message}");
                    }
                }
            }
        }

        /// <summary>Writes the part of the server's log that the run's copy does not have yet, creating the copy once the run has a name.</summary>
        private static void CopyNewBytes()
        {
            if (!File.Exists(logPath))
            {
                return;
            }
            // The server keeps its log open for writing, so open it for sharing.
            using (FileStream log = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
            {
                if (copyPath != null && log.Length < copiedBytes)
                {
                    copyPath = null;
                    copiedBytes = 0;
                }
                if (copyPath == null)
                {
                    byte[] whole = ReadFrom(log, 0);
                    string runKey = RunKeyOf(whole);
                    if (runKey == null)
                    {
                        return;
                    }
                    string folder = Path.Combine(Path.GetDirectoryName(logPath), FolderName);
                    Directory.CreateDirectory(folder);
                    copyPath = Path.Combine(folder, runKey + FileExtension);
                    File.WriteAllBytes(copyPath, whole);
                    copiedBytes = whole.Length;
                    return;
                }
                if (log.Length == copiedBytes)
                {
                    return;
                }
                byte[] added = ReadFrom(log, copiedBytes);
                using (FileStream copy = new FileStream(copyPath, FileMode.Append, FileAccess.Write, FileShare.Read))
                {
                    copy.Write(added, 0, added.Length);
                }
                copiedBytes += added.Length;
            }
        }

        /// <summary>Returns the bytes of [log] from [offset] to its end as of now.</summary>
        private static byte[] ReadFrom(FileStream log, long offset)
        {
            byte[] bytes = new byte[log.Length - offset];
            log.Seek(offset, SeekOrigin.Begin);
            int read = 0;
            while (read < bytes.Length)
            {
                int count = log.Read(bytes, read, bytes.Length - read);
                if (count == 0)
                {
                    break;
                }
                read += count;
            }
            if (read < bytes.Length)
            {
                Array.Resize(ref bytes, read);
            }
            return bytes;
        }

        /// <summary>
        /// Returns the server-local time of the first timestamped line in [bytes] as <c>20261030-154344</c>, the same
        /// name the dashboard gives a run, or null when no line has a timestamp yet.
        /// </summary>
        private static string RunKeyOf(byte[] bytes)
        {
            foreach (string line in Encoding.UTF8.GetString(bytes).Split('\n'))
            {
                Match match = TimestampPattern.Match(line);
                if (match.Success)
                {
                    GroupCollection g = match.Groups;
                    return $"{g["year"]}{g["month"]}{g["day"]}-{g["hour"]}{g["minute"]}{g["second"]}";
                }
            }
            return null;
        }
    }
}

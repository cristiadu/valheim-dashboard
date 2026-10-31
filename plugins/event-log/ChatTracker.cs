using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs chat and map pings as the server passes them between players. A message only reaches the server
    /// when another player is online to receive it.
    /// </summary>
    [HarmonyPatch]
    internal static class ChatTracker
    {
        /// <summary>Hash of the call that carries shouts and pings to every player.</summary>
        private static readonly int ChatMessageHash = "ChatMessage".GetStableHashCode();

        /// <summary>Hash of the call that carries normal talk and whispers to nearby players.</summary>
        private static readonly int SayHash = "Say".GetStableHashCode();

        /// <summary>Seconds in which the same message is logged once, since one copy is sent to each player.</summary>
        private const float RepeatWindowSeconds = 2f;

        /// <summary>Game time each recent message was logged, in seconds, by sender, kind and text.</summary>
        private static readonly Dictionary<string, float> LoggedTimes = new Dictionary<string, float>();

        /// <summary>Reads chat and pings from each call a player sends through the server.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(ZRoutedRpc), "RPC_RoutedRPC")]
        private static void BeforeRoutedRpc(ZPackage pkg)
        {
            if (ZNet.instance == null || !ZNet.instance.IsServer())
            {
                return;
            }
            ZRoutedRpc.RoutedRPCData data = new ZRoutedRpc.RoutedRPCData();
            data.Deserialize(new ZPackage(pkg.GetArray()));
            ZPackage parameters = data.m_parameters;
            if (data.m_methodHash == ChatMessageHash)
            {
                Vector3 position = parameters.ReadVector3();
                LogMessage((Talker.Type)parameters.ReadInt(), parameters, position);
            }
            else if (data.m_methodHash == SayHash)
            {
                LogMessage((Talker.Type)parameters.ReadInt(), parameters, Vector3.zero);
            }
        }

        /// <summary>Logs one chat message of [type], or a ping at [position], read from [parameters].</summary>
        private static void LogMessage(Talker.Type type, ZPackage parameters, Vector3 position)
        {
            string sender = parameters.ReadString();
            parameters.ReadString();
            string text = parameters.ReadString().Replace('\n', ' ');
            string key = $"{sender}|{type}|{text}";
            if (LoggedTimes.TryGetValue(key, out float loggedTime) && Time.time - loggedTime < RepeatWindowSeconds)
            {
                return;
            }
            LoggedTimes[key] = Time.time;
            switch (type)
            {
                case Talker.Type.Ping:
                    ZLog.Log($"Ping: {sender} at {Mathf.RoundToInt(position.x)} {Mathf.RoundToInt(position.z)}");
                    break;
                case Talker.Type.Shout:
                    ZLog.Log($"Chat: {sender} shouted: {text}");
                    break;
                case Talker.Type.Whisper:
                    ZLog.Log($"Chat: {sender} whispered: {text}");
                    break;
                default:
                    ZLog.Log($"Chat: {sender} said: {text}");
                    break;
            }
        }
    }
}

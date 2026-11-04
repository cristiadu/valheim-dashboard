using System.Collections.Generic;
using BepInEx.Logging;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs skill level-ups and trades with traders such as Haldor. Both happen only on the player's game, but the
    /// game plays an effect for each, and an effect the game shares with other players reaches the server as a new
    /// object made by that player's game. Only effects made for one kind of action are watched.
    /// </summary>
    [HarmonyPatch]
    internal static class EffectTracker
    {
        /// <summary>Where the startup list of watched effects is written.</summary>
        private static readonly ManualLogSource Log = BepInEx.Logging.Logger.CreateLogSource("Effects");

        /// <summary>Line start for each watched effect, by effect prefab hash, built on first use.</summary>
        private static Dictionary<int, string> watched;

        /// <summary>Effects already logged, so an effect sent again is logged once.</summary>
        private static readonly HashSet<ZDOID> Logged = new HashSet<ZDOID>();

        /// <summary>
        /// Logs a watched effect that a player's game just sent to the server, with that player. The game calls
        /// this for each object it receives, after reading the object's data.
        /// </summary>
        [HarmonyPostfix]
        [HarmonyPatch(typeof(ZDOMan), "AddIfPortal")]
        private static void AfterReceived(ZDO zdo, int prefabHash)
        {
            if (ZNet.instance == null || !ZNet.instance.IsServer() || ZNetScene.instance == null || prefabHash == 0)
            {
                return;
            }
            if (watched == null)
            {
                watched = FindWatched();
            }
            ZNetPeer peer = ZNet.instance.GetPeer(zdo.GetOwner());
            if (peer != null && watched.TryGetValue(prefabHash, out string line) && Logged.Add(zdo.m_uid))
            {
                GameEventLog.Write(string.Format(line, Names.Peer(peer.m_uid)));
            }
        }

        /// <summary>Forgets the effect [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            Logged.Remove(uid);
        }

        /// <summary>
        /// Returns the line for each shared effect played when a player's skill goes up or when they buy from or
        /// sell to a trader, with <c>{0}</c> for the player. An effect played for more than one of these is left
        /// out, since it would not say which one happened.
        /// </summary>
        private static Dictionary<int, string> FindWatched()
        {
            Dictionary<int, HashSet<string>> lines = new Dictionary<int, HashSet<string>>();
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                Player player = prefab.GetComponent<Player>();
                if (player != null)
                {
                    AddLines(lines, player.m_skillLevelupEffects, "Skill up: {0}");
                }
                Trader trader = prefab.GetComponent<Trader>();
                if (trader != null)
                {
                    AddLines(lines, trader.m_randomBuyFX, $"Traded: {{0}} bought from {prefab.name}");
                    AddLines(lines, trader.m_randomSellFX, $"Traded: {{0}} sold to {prefab.name}");
                }
            }
            Dictionary<int, string> found = new Dictionary<int, string>();
            foreach (KeyValuePair<int, HashSet<string>> entry in lines)
            {
                if (entry.Value.Count == 1)
                {
                    found[entry.Key] = new List<string>(entry.Value)[0];
                }
            }
            Log.LogInfo($"Watching {found.Count} shared effects: {string.Join("; ", found.Values)}");
            return found;
        }

        /// <summary>Adds [line] to [lines] for each effect in [effects] that the game shares with other players.</summary>
        private static void AddLines(Dictionary<int, HashSet<string>> lines, EffectList effects, string line)
        {
            foreach (EffectList.EffectData effect in effects.m_effectPrefabs)
            {
                if (effect.m_prefab == null || effect.m_prefab.GetComponent<ZNetView>() == null)
                {
                    continue;
                }
                int hash = effect.m_prefab.name.GetStableHashCode();
                if (!lines.TryGetValue(hash, out HashSet<string> forEffect))
                {
                    forEffect = new HashSet<string>();
                    lines[hash] = forEffect;
                }
                forEffect.Add(line);
            }
        }
    }
}

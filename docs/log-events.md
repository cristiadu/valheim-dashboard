# Valheim server log events

Which game events the dedicated server writes to `logs.txt`, and the regex to read each one.

Based on a Valheim 1.0.21 server with crossplay on. Names, IDs, IP and join code in the examples are
replaced.

## Line format

```
10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1
```

Timestamp regex: `^(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{4}) (?<time>\d{2}:\d{2}:\d{2}): (?<message>.*)$`

- Time is server local time, month first.
- Lines without a timestamp come from the Unity engine. Skip them.
- The event regexes below match `message`. They work in Dart as raw strings, for example
  `RegExp(r'^RPC_Disconnect$')`.
- The server overwrites `logs.txt` on each start, so the dashboard must keep its own copy of events.

## Player IDs

The log names one player in several ways. Group them under the Steam ID: one Steam ID is one person.

```mermaid
flowchart LR
    SteamID[Steam ID] --- SteamName[Steam name: Tony Example]
    SteamID --- PlayFab[PlayFab ID, one per connection]
    PlayFab --- Peer[ZDOID peer ID, one per connection]
    Peer --- Character[Character name: Ragnar]
```

| ID | Example | Lasts |
| --- | --- | --- |
| Steam ID | `Steam_76561198000000001` | Always |
| Steam name | `Tony Example` | Always |
| PlayFab ID (crossplay connection) | `A1B2C3D4E5F60718` | One connection |
| Character name | `Ragnar` | Always (one Steam account can have many) |
| ZDOID | `549297305:1` (peer ID `:` object ID) | One connection |

In the sample log, Steam name `Tony Example` and character `Ragnar` are the same person. Show the
player as one entry, for example `Ragnar (Tony Example)`.

The server's own Steam ID (`Caching Steam ID: 76561197960265728`) and `Server ID` at startup belong
to the server, not to a player.

## Join and leave

```mermaid
sequenceDiagram
    participant P as Player
    participant S as Server log
    P->>S: PlayFab listen socket child connected to remote player {PlayFab ID}
    S->>S: Player joined server ... now 1 player(s)
    S->>S: PlayFab socket with remote ID playfab/{PlayFab ID} received local Platform ID {Steam ID}
    S->>S: Got handshake from client playfab/{PlayFab ID}
    S->>S: Got character ZDOID from {character} : {peer ID}:1
    Note over S: every world save: Sent to playfab/{PlayFab ID}
    P->>S: RPC_Disconnect
    S->>S: Destroying abandoned non persistent zdo ... owner {peer ID}
    S->>S: Player connection lost server ... now 0 player(s)
```

How to link the lines into one session:

1. The PlayFab ID links the connect, Steam ID and handshake lines.
2. The first `Got character ZDOID` after a handshake belongs to that player. It gives the character
   name and the peer ID. A player whose join fails can handshake again; only their latest handshake
   counts, so the next player's character is not given their account.
3. The leave is the `Destroying abandoned ... owner {peer ID}` line with the same peer ID.
4. `RPC_Disconnect` and the `now N player(s)` lines have no player in them. Use them only for counts.
5. If a leave is missed, `Sent to playfab/{PlayFab ID}` at each world save lists who is still online.

| Event | Example | Regex |
| --- | --- | --- |
| Known player (at startup) | `Player history entry with index 0:  Tony Example (Steam_76561198000000001, 3C9D07E1B2A4F856)` | `^Player history entry with index (?<index>\d+):\s+(?<steamName>.+) \((?<steamId>\w+_\d+), (?<playFabId>[0-9A-F]+)\)$` |
| Connected | `PlayFab listen socket child connected to remote player A1B2C3D4E5F60718` | `^PlayFab listen socket child connected to remote player (?<playFabId>[0-9A-F]+)$` |
| Player count up | `Player joined server "FlanServer" that has join code 123456, now 1 player(s)` | `^Player joined server "(?<server>.+)" that has join code (?<joinCode>\d+), now (?<players>\d+) player\(s\)$` |
| Steam ID | `PlayFab socket with remote ID playfab/A1B2C3D4E5F60718 received local Platform ID Steam_76561198000000001` | `^PlayFab socket with remote ID playfab/(?<playFabId>[0-9A-F]+) received local Platform ID (?<steamId>\w+_\d+)$` |
| Handshake | `Got handshake from client playfab/A1B2C3D4E5F60718` | `^Got handshake from client (?<client>\S+)$` |
| Character spawned | `Got character ZDOID from Ragnar : 549297305:1` | `^Got character ZDOID from (?<character>.+) : (?<peerId>-?\d+):(?<objectId>\d+)$` |
| Disconnect | `RPC_Disconnect` | `^RPC_Disconnect$` |
| Player objects removed | `Destroying abandoned non persistent zdo 549297305:9175 owner 549297305` | `^Destroying abandoned non persistent zdo (?<peerId>-?\d+):(?<objectId>\d+) owner (?<owner>-?\d+)$` |
| Player count down | `Player connection lost server "FlanServer" that has join code 123456, now 0 player(s)` | `^Player connection lost server "(?<server>.+)" that has join code (?<joinCode>\d+), now (?<players>\d+) player\(s\)$` |
| Still online (each save) | `Sent to playfab/A1B2C3D4E5F60718` | `^Sent to (?<client>\S+)$` |
| Connection count (each save) | ` Connections 1 ZDOS:140218  sent:0 recv:260` | `^ Connections (?<connections>\d+) ZDOS:(?<zdos>\d+)  sent:(?<sent>\d+) recv:(?<recv>\d+)$` |

The connection count line starts with a space and has two spaces before `sent`.

## Deaths, raids and bosses

None of these happened in the sample log. The lines below come from other server owners' logs
(see Sources).

| Event | Example | Regex |
| --- | --- | --- |
| Death | `Got character ZDOID from Ragnar : 0:0` | Character spawned regex with peer ID `0` and object ID `0` |
| Respawn | `Got character ZDOID from Ragnar : 549297305:2` | Character spawned regex, the next one after a death |
| Raid check | `Possible events:1` | `^Possible events:(?<count>\d+)$` |
| Raid started | `Random event set:army_theelder` | `^Random event set:(?<event>\w+)$` |

The server checks for a raid about every 46 minutes. `Possible events:0` means no raid can happen
yet. The log has no line for when a raid ends.

Raid names:

| Name | Message in game | Unlocked by |
| --- | --- | --- |
| `army_eikthyr` | Eikthyr rallies the creatures of the forest. | Start of the world |
| `army_theelder` | The forest is moving... | Eikthyr |
| `army_bonemass` | A foul smell from the swamp... | The Elder |
| `army_moder` | A cold wind blows from the mountains. | Bonemass |
| `army_goblin` | The horde is attacking! | Moder |
| `foresttrolls` | The ground is shaking. | A troll kill and The Elder |
| `skeletons` | A skeleton surprise! | Bonemass |
| `blobs` | A foul smell from the swamp... | Bonemass |
| `ghosts` | You feel a chill down your spine... | Bonemass |
| `wolves` | You are being hunted... | Bonemass |
| `surtlings` | There's a smell of sulfur in the air... | A surtling kill and Bonemass |
| `bats` | You stirred the cauldron. | A bat kill and Bonemass |
| `army_gjall` | What's up, Gjall?! | Yagluth |
| `army_seekers` | They sought you out. | Yagluth |
| `army_charred` | The undead army marches. | The Queen |
| `army_charredspawners` | The dead have been summoned. | The Queen |
| `hildirboss1` to `hildirboss3` | (Hildir quest bosses) | Returning Hildir's chests |

### Boss kills

The server does not log boss kills. It stores them as keys in the world save
(`worlds_local/<world>/_main.<N>.db2`, highest `N`). The file has a 16-byte header, then gzip data
that holds the keys as plain text.

| Key | Boss |
| --- | --- |
| `defeated_eikthyr` | Eikthyr |
| `defeated_gdking` | The Elder |
| `defeated_bonemass` | Bonemass |
| `defeated_dragon` | Moder |
| `defeated_goblinking` | Yagluth |
| `defeated_queen` | The Queen |
| `defeated_fader` | Fader |

The sample world `Cotil` has `defeated_eikthyr` and `killedtroll`. A new key between two saves
means that boss was killed between those save times.

## Other events

Also not in the sample log.

| Event | Example | Regex |
| --- | --- | --- |
| Player timed out | `ZRpc timeout detected` | `^ZRpc timeout detected` (a leave, like `RPC_Disconnect`) |
| Night skipped (players slept) | a line containing `day:2` | `day:(?<day>\d+)` (day counts from 0, so this is day 3) |
| Server stopped | `OnApplicationQuit` | `OnApplicationQuit` |
| Network trouble | `Resume TX on playfab/A1B2C3D4E5F60718` | `^Resume TX on playfab/(?<playFabId>[0-9A-F]+)` |
| World loaded (before 1.0.7) | `Load world: Cotil (Cotil)` | `^Load world: (?<world>.+?) \(` |
| World saved (before 1.0) | `World saved ( 120ms )` | `^World saved \( (?<ms>.+)ms \)` |

`OnApplicationQuit` may have no timestamp. If the log ends without it, the server crashed or was
killed. Tools only match `day:` as text; nobody publishes the full night-skip line.

## Event log plugin

The game does not log building, chat or boss progress. The event log plugin in `plugins/event-log`
runs on the server only and writes these lines. A player is the character name, or `an unknown player`
when the plugin does not know who it was.

| Event | Example | Regex |
| --- | --- | --- |
| Piece built | `Piece built: wood_floor_1x1 by Ragnar` | `^Piece built: (?<piece>\S+) by (?<builder>.+)$` |
| Piece destroyed or removed | `Piece destroyed: wood_fence built by Ragnar` | `^Piece destroyed: (?<piece>\S+) built by (?<builder>.+)$` |
| Chat | `Chat: Ragnar shouted: Troll at the gate!` | `^Chat: (?<character>.+?) (?<kind>said\|shouted\|whispered): (?<text>.*)$` |
| Map ping | `Ping: Ragnar at 120 -340` | `^Ping: (?<character>.+) at (?<x>-?\d+) (?<z>-?\d+)$` |
| Global key set or removed | `Global key set: defeated_eikthyr` | `^Global key (?<change>set\|removed): (?<key>.+)$` |
| Raid ended | `Raid ended: army_eikthyr` | `^Raid ended: (?<raid>\w+)$` |
| Boss summoned | `Boss summoned: Eikthyr by Ragnar` | `^Boss summoned: (?<boss>\S+) by (?<summoner>.+)$` |
| Boss hurt | `Boss hurt: Eikthyr 50` | `^Boss hurt: (?<boss>\S+) (?<percent>\d+)$` |
| Boss defeated | `Boss defeated: Eikthyr after 187 seconds by Ragnar, Bjorn` | `^Boss defeated: (?<boss>\S+) after (?<seconds>\d+) seconds by (?<attackers>.+)$` |
| New in-game day | `Day started: 42` | `^Day started: (?<day>\d+)$` |
| Player died | `Player died: Ragnar in BlackForest while fighting Troll` | `^Player died: (?<character>.+?) in (?<area>\w+)(?: while fighting (?<fighting>.+))?$` |
| Close call | `Close call: Ragnar down to 4 of 110 health in BlackForest while fighting Troll` | `^Close call: (?<character>.+?) down to (?<health>\d+) of (?<maxHealth>\d+) health in (?<area>\w+)(?: while fighting (?<fighting>.+))?$` |
| Area entered | `Area entered: Ragnar Swamp` | `^Area entered: (?<character>.+) (?<area>\w+)$` |
| Came out of a portal | `Teleported: Ragnar to Home base` | `^Teleported: (?<character>.+?) to (?<portal>.+)$` |
| PvP turned on or off | `PvP turned on: Ragnar` | `^PvP turned (?<state>on\|off): (?<character>.+)$` |
| Went to bed | `Went to bed: Ragnar` | `^Went to bed: (?<character>.+)$` |
| New gear | `Gear: Ragnar SwordIron quality 2` | `^Gear: (?<character>.+?) (?<item>\S+)(?: quality (?<quality>\d+))?$` |
| What a player wears now | `Wearing: Ragnar has ArmorLeatherChest, SwordIron` | `^Wearing: (?<character>.+?) has (?<items>.+)$` |
| Creature killed | `Creature killed: Troll level 2 by Ragnar, Bjorn` | `^Creature killed: (?<creature>\S+) level (?<level>\d+) by (?<attackers>.+)$` |
| Tame tamed, born, grown up or died | `Tame born: Wolf_cub` | `^(?<change>Tamed\|Tame born\|Tame grew up\|Tame died): (?<creature>\S+)(?: (?<name>.+))?$` |
| Tame named | `Pet named: Wolf Fluffy` | `^Pet named: (?<creature>\S+) (?<name>.+)$` |
| Sign written | `Sign written: Ragnar: Keep out` | `^Sign written: (?<author>.+?): (?<text>.*)$` |
| Item hung on an item stand, or put on an armor stand | `Item hung: TrophyDeer by Ragnar` | `^Item hung: (?<item>\S+) by (?<player>.+)$` |
| Item picked up | `Picked up: Wood x20 by Ragnar (item 52731986:1420)`, or `Picked up again: Wood x20 by Ragnar (item 52731986:1420)` | `^Picked up(?<again> again)?: (?<item>\S+) x(?<count>\d+) by (?<player>.+?)(?: \(item (?<id>\S+)\))?$` |
| Item dropped | `Dropped: Wood x20 by Ragnar (item 52731986:1420)` | `^Dropped: (?<item>\S+) x(?<count>\d+) by (?<player>.+) \(item (?<id>\S+)\)$` |
| Items put in or taken from a chest | `Stored: Wood x20 in piece_chest_wood by Ragnar` | `^(?<change>Stored\|Taken): (?<item>\S+) x(?<count>\d+) (?:in\|from) (?<chest>\S+) by (?<player>.+)$` |
| Plant harvested | `Harvested: RaspberryBush by Ragnar` | `^Harvested: (?<plant>\S+) by (?<player>.+)$` |
| Crop or sapling planted | `Planted: sapling_carrot by Ragnar` | `^Planted: (?<plant>\S+) by (?<player>.+)$` |
| Food eaten or mead drunk | `Ate: Ragnar CookedMeat` | `^Ate: (?<character>.+) (?<item>\S+)$` |
| Started eating or drinking, but the food never showed in their hand, with how much their max health went up (0 for a mead) | `Ate something: Ragnar (max health +30)`, or `Ate something: Ragnar` before plugin 2.22.0 | `^Ate something: (?<character>.+?)(?: \(max health \+(?<gain>\d+)\))?$` |
| Items or fuel put into a smelter, kiln or similar | `Smelting: CopperOre x3 in smelter by Ragnar`, `Smelting: Coal x5 in smelter by Ragnar` | `^Smelting: (?<item>\S+) x(?<count>\d+) in (?<station>\S+) by (?<player>.+)$` |
| Raw food put on a cooking station, or a mead base into a fermenter | `Cooking: RawMeat on piece_cookingstation by Ragnar`, `Fermenting: MeadBaseTasty in fermenter by Ragnar` | `^(?<kind>Cooking\|Fermenting): (?<item>\S+) (?:on\|in) (?<station>\S+) by (?<player>.+)$` |
| Food on a cooking station got cooked, or burnt to coal (names the raw food) | `Cooked: CookedMeat on piece_cookingstation by Ragnar`, `Burnt: RawMeat on piece_cookingstation by Ragnar` | `^(?<kind>Cooked\|Burnt): (?<item>\S+) on (?<station>\S+) by (?<player>.+)$` |
| Mead in a fermenter is ready, or was tapped | `Mead ready: MeadTasty x6 in fermenter`, `Mead tapped: MeadTasty x6 from fermenter by Ragnar` | `^Mead (?<state>ready\|tapped): (?<item>\S+) x(?<count>\d+) (?:in\|from) (?<station>\S+)(?: by (?<player>.+))?$` |
| Took the helm of a raft or ship | `Sailing: Ragnar on Karve` | `^Sailing: (?<character>.+) on (?<ship>\S+)$` |
| Opened a crafting station (several kinds share one name, joined with `/`, when they share an animation) | `Crafting: Ragnar at forge` | `^Crafting: (?<character>.+?) at (?<station>\S+)$` |
| Did an emote | `Emote: Ragnar wave` | `^Emote: (?<character>.+) (?<emote>\S+)$` |
| Claimed a bed | `Bed claimed: Ragnar` | `^Bed claimed: (?<character>.+)$` |
| Named a portal | `Portal named: Swamp camp by Ragnar` | `^Portal named: (?<portal>.+) by (?<player>.+)$` |
| Ward turned on or off, which only its builder can do | `Ward turned off: guard_stone by Ragnar` | `^Ward turned (?<state>on\|off): (?<ward>\S+) by (?<builder>.+)$` |
| Items a player made, once more of them sit in chests or on the ground than ever before. An item carried since before the server started counts when it first shows up | `Made: ArrowFlint x20 by Ragnar` | `^Made: (?<item>\S+) x(?<count>\d+) by (?<crafter>.+)$` |
| An item a player made showed up at a higher level | `Upgraded: SwordBronze to level 2 by Ragnar` | `^Upgraded: (?<item>\S+) to level (?<level>\d+) by (?<crafter>.+)$` |
| Used a forsaken power. Which power is never sent | `Power used: Ragnar` | `^Power used: (?<character>.+)$` |
| Read a vegvisir or rune stone, which marks a place on the map | `Location revealed: Eikthyrnir by Ragnar` | `^Location revealed: (?<location>\S+) by (?<player>.+)$` |
| Got on a saddled tame | `Riding: Ragnar on Lox` | `^Riding: (?<player>.+) on (?<creature>\S+)$` |
| Put a saddle on a tame | `Saddled: Lox by Ragnar` | `^Saddled: (?<creature>\S+) by (?<player>.+)$` |
| A tame started following a player | `Tame following: Wolf follows Ragnar` | `^Tame following: (?<creature>\S+) follows (?<player>.+)$` |
| Started pulling a cart | `Pulling cart: Ragnar with Cart` | `^Pulling cart: (?<player>.+) with (?<cart>\S+)$` |
| Items destroyed in an obliterator after a player pulled its lever | `Obliterated: Resin x20 in incinerator by Ragnar` | `^Obliterated: (?<item>\S+) x(?<count>\d+) in (?<station>\S+) by (?<player>.+)$` |
| Arrow, bolt or other ammo shot | `Shot: ArrowFire by Ragnar` | `^Shot: (?<item>\S+) by (?<player>.+)$` |
| Put fuel on a fire | `Fueled: fire_pit by Ragnar` | `^Fueled: (?<fire>\S+) by (?<player>.+)$` |
| Repaired a built piece | `Repaired: wood_wall by Ragnar` | `^Repaired: (?<piece>\S+) by (?<player>.+)$` |
| Added what they explored to a map table | `Map shared: Ragnar at piece_cartographertable` | `^Map shared: (?<player>.+) at (?<table>\S+)$` |
| A player gave themselves access to a ward that was off, or took it away | `Ward access given: Ragnar on guard_stone built by Bjorn` | `^Ward access (?<change>given\|removed): (?<player>.+) on (?<ward>\S+) built by (?<builder>.+)$` |
| Tree cut down or rock mined out | `Tree cut: Beech1 by Ragnar`, `Rock mined: rock4_copper by Ragnar` | `^(?<kind>Tree cut\|Rock mined): (?<thing>\S+) by (?<player>.+)$` |
| Where a player stands | `Position: Ragnar 120 -340` | `^Position: (?<character>.+) (?<x>-?\d+) (?<z>-?\d+)$` |
| What a chest, cart or ship holds | `Chest: 52731986:1203 piece_chest_wood at 118 -336 built by Ragnar holds Wood x20, Stone x3` | `^Chest: (?<id>\S+) (?<chest>\S+) at (?<x>-?\d+) (?<z>-?\d+) built by (?<builder>.*?) holds (?<items>.+)$` |
| Chest, cart or ship destroyed | `Chest removed: 52731986:1203` | `^Chest removed: (?<id>\S+)$` |
| A sign right against a chest names it | `Chest label: 52731986:1203 Ores` | `^Chest label: (?<id>\S+) (?<label>.+)$` |
| The sign that named a chest is gone or blank | `Chest unlabeled: 52731986:1203` | `^Chest unlabeled: (?<id>\S+)$` |
| Where a Leviathan is | `Leviathan: 52731986:4410 at -1520 2210` | `^Leviathan: (?<id>\S+) at (?<x>-?\d+) (?<z>-?\d+)$` |
| A Leviathan dived away | `Leviathan gone: 52731986:4410` | `^Leviathan gone: (?<id>\S+)$` |
| What a player carried when they died | `Tombstone: Ragnar at 410 -77 holds SwordBronze x1, Coins x55` | `^Tombstone: (?<owner>.+?) at (?<x>-?\d+) (?<z>-?\d+) holds (?<items>.+)$` |
| Terrain file written | `Terrain written: C:\Valheim Server\terrain-Cotil.txt` | `^Terrain written: (?<path>.+)$` |
| Item stacks file written | `Item stacks written: C:\Valheim Server\item-stacks.txt` | `^Item stacks written: (?<path>.+)$` |
| Piece costs file written | `Piece costs written: C:\Valheim Server\piece-costs.txt` | `^Piece costs written: (?<path>.+)$` |
| Craft costs file written | `Craft costs written: C:\Valheim Server\craft-costs.txt` | `^Craft costs written: (?<path>.+)$` |
| Foods file written | `Foods written: C:\Valheim Server\foods.txt` | `^Foods written: (?<path>.+)$` |
| Fire fuels file written | `Fire fuels written: C:\Valheim Server\fire-fuels.txt` | `^Fire fuels written: (?<path>.+)$` |
| Game names file written | `Game names written: C:\Valheim Server\game-names.txt` | `^Game names written: (?<path>.+)$` |
| Tombstone emptied | `Tombstone emptied: Ragnar by Bjorn` | `^Tombstone emptied: (?<owner>.+?) by (?<player>.+)$` |

- **Chat** only reaches the server when another player is online to receive it. `said` is normal
  talk, `shouted` reaches everyone, `whispered` reaches players close by.
- **Global keys** mark world progress. The game sets `defeated_<boss>` each time a boss dies, for
  example `defeated_eikthyr`, `defeated_gdking` (The Elder) or `defeated_bonemass`.
- **Boss summoned** names the player whose offering summoned the boss.
- **Boss hurt** is logged once each when a summoned boss drops to 75, 50 and 25 percent of its health.
- **Boss defeated** has the seconds from the summon to the death, and every player who hit the boss.
  Both lines cover bosses summoned since the server started.
- **Close call** is a player whose health fell to 15 percent of their max or less and came back to
  40 percent without dying. It has their lowest health, and `while fighting` as in **Player died**.
- **Player died** comes with the game's own `Got character ZDOID from Ragnar : 0:0`. `while fighting`
  lists creatures that attacked within 5 seconds and 30 meters, and players who hit them in PvP.
- **Area** is a biome (`Meadows`, `BlackForest`, `Swamp`, `Mountain`, `Plains`, `Mistlands`,
  `AshLands`, `DeepNorth`, `Ocean`) or `Dungeon`. It is logged once the player stays in it for two scans.
- **Teleported** is the portal's name, or `an unnamed portal`.
- **Creature killed** lists every player who hit the creature, since each creature remembers them.
  Creatures that die without a player hitting them are not logged, except tames (`Tame died`).
  `level` is 1 for a creature with no stars.
- **Sign written**, **Item hung**, **Stored**, **Taken** and **Tombstone emptied** name the player whose
  game changed the object. A game takes over an object before it changes it.
- **Picked up** is only logged when that player stands within 10 meters of the item, since items left
  alone despawn, and no creature that eats off the ground stands within 3 meters of it. The game marks an
  item the first time it reaches anyone's inventory, and the mark stays through drops and chests. An item
  with the mark is logged as **Picked up again**. `item` is the object ID the item had on the ground; lines from
  before plugin 2.15.0 have none.
- **Dropped** is logged when an item someone carried lands on the ground, naming the player whose game made it.
  The game starts an object's ID with the ID of the game that made it, so the dropper is exact. Items a broken
  chest, cart or ship, or an emptied item stand, let go of are not drops. The pickup line repeats the same `item` ID.
- **Harvested** names the player who asked to harvest, or the player whose game owns the plant.
- **Cooked** and **Burnt** name the player who put the food on, which the cooking station keeps per slot.
- **Mead ready** is logged once the mead stayed ready for 15 seconds with a player near, since a fermenter only works
  while a player's game runs it. **Mead tapped** names the player who asked to tap, or whose game owns the fermenter.
- **Ate** reads the food the character holds for a moment after the eat animation, which every game shows.
  Food held this way is never logged as **Gear**.
- **Smelting**, **Tree cut** and **Rock mined** name the player who hit or filled it through the server in the
  last 10 seconds, or else the player whose game owns it. A station's queue is read once per scan. Since plugin
  2.21.0, fuel put in a station, such as coal in a smelter, is a **Smelting** line too, one per scan.
- **Shot** is logged since plugin 2.21.0 when a flying arrow or bolt is gone. The shooter's game makes it, so its
  object ID starts with the shooter's ID. Ammo that shares its flying object with other ammo isn't logged, since
  the object can't tell which one it was.
- **Planted** replaces **Piece built** for crops and saplings. A plant that grows is not logged as destroyed.
- **Position** is logged each time a player has walked 20 meters from the last one, outside dungeons. `x` is
  meters east and `z` meters north of the world's center.
- **Chest** is logged for every chest, cart and ship when the server starts, and again each time what it holds
  changes. `holds nothing` is an empty one. The ID stays the same until the server stops. `built by` is the
  character name, or the Steam name when the builder has not been online since the server started. The dashboard
  shows that Steam name as the player's character.
- **Chest label** is logged after a chest's first **Chest** line, and again when its sign changes. A sign names a
  chest when it stands within 1.25 m of the chest's spot. Each sign names only the chest closest to it, and a chest
  with more than one goes by the closest. Carts and ships get no label, since they move. Color tags are left out.
- **Leviathan** is logged for every Leviathan when the server starts, and when a new one appears in the sea
  near a player. **Leviathan gone** is logged when one dives away for good after being mined.
- **Tombstone** is logged when a player dies, with everything they carried.
- **Terrain written** is logged once per world, when the plugin writes the land type of every 32 m square
  next to `logs.txt`. Rows go north to south; each letter is a biome (`M` Meadows, `B` Black Forest, `S` Swamp,
  `O` Mountain, `P` Plains, `I` Mistlands, `A` Ashlands, `N` Deep North), `~` is water and `.` is outside the world.
- **Gear** is logged the first time a player wears or holds an item since the server started.
- **Wearing** lists every piece a player wears, holds or carries on the back, by prefab and sorted, each time
  that list changes and the first time the player is seen after a start. `has nothing` means nothing at all.
  Levels are only in **Gear** lines.
- **Item stacks written** is logged once per start, when the plugin writes how many of each item fit in one slot
  next to `logs.txt`, one `Wood 50` line per item.
- **Piece costs written** follows it, when the plugin writes what building each piece takes next to `logs.txt`,
  one `wood_floor Wood x2` line per piece, crops and saplings included.
- **Craft costs written** follows it, when the plugin writes what crafting takes next to `logs.txt`, one line per
  item and level with how many one craft makes: `ArrowWood 1 20 Wood x8`, or `SwordBronze 2 1 Bronze x4` for an upgrade.
- **Foods written** and **Fire fuels written** follow it: one food per line (`CookedMeat`), and one line per fire
  with the item it burns (`piece_groundtorch_wood Resin`).
- **Game names written** follows them, since plugin 2.20.0: one line per item, piece, creature and raid with
  the English name the game shows (`AtgeirIron Iron atgeir`, `army_theelder The ground is shaking`).
- **Fueled** is logged once for each item put on the fire, since plugin 2.18.0.
- **Chest** is logged only when its line changes, since plugin 2.19.0. Before that, ships and carts repeated the
  same line every few seconds. Older plugins left the builder blank for a player who was joining again.

To build it, install the .NET SDK and BepInExPack_Valheim on the server, run `dotnet build -c Release`
in `plugins/event-log`, and copy `bin\Release\netstandard2.1\ValheimDashboard.EventLog.dll` to the
server's `BepInEx\plugins` folder. Remove the older `ValheimDashboard.BuildLog.dll` if it is there.
After that, the update task in `scripts` installs each new version from `main` by itself.

The plugin also copies BepInEx's own messages, such as plugin errors, into `logs.txt` as
`[Error : Source] message` lines. To keep every log in the server's log folder, turn off BepInEx's
`LogOutput.log` in `BepInEx\config\BepInEx.cfg`: set `Enabled = false` under `[Logging.Disk]`.

## Refused joins

The player tried to connect and the server sent them away. Tools match these by the text in the
line, since the start of the line differs by version.

| Reason | Text in the line | Regex |
| --- | --- | --- |
| Wrong password | `Peer 76561198000000001 has wrong password` | `has wrong password` |
| Wrong game version | `... has incompatible version` | `has incompatible version` |
| Banned or not on the permitted list | `... is blacklisted or not in whitelist.` | `is blacklisted or not in whitelist` |
| Steam could not verify the player | `... has invalid session ticket` | `has invalid session ticket` |
| Server full (10 players) | `... disconnected due to server is full` | `server is full` |
| Blocked by the host (crossplay) | `The player with the ID ... is blocked by the server owner` | `is blocked by the server owner` |
| Not signed in to PlayFab (crossplay) | `... disconnected because they were not authenticated!` | `were not authenticated` |
| Platform not allowed (crossplay) | `Peer diconnected due to server platform privileges disallowing crossplay` | `disallowing crossplay` |

`diconnected` is spelled that way in the game.

The line starts with `Peer` and the connection, a PlayFab or Steam ID (`Peer playfab/6F6C3330B7FD733E has wrong password`).
The Server tab names the player through the `received local Platform ID` line of that connection.

## Steam-only servers

Without crossplay, the server writes Steam IDs instead of PlayFab IDs:

| Event | Example | Regex |
| --- | --- | --- |
| Connected | `Got connection SteamID 76561198000000001` | `^Got connection SteamID (?<steamId>\d+)$` |
| Handshake | `Got handshake from client 76561198000000001` | Handshake regex above |
| Wrong password | `Peer 76561198000000001 has wrong password` | `^Peer (?<steamId>\d+) has wrong password$` |
| Left | `Closing socket 76561198000000001` | `^Closing socket (?<steamId>\d+)$` (ignore `Closing socket 0`) |

## World saves and backups

A world save runs every 10 minutes, with or without players.

```mermaid
flowchart LR
    A[Available space ...] --> B[### Save World Thread Started! ###]
    B --> C[Considering autobackup ...]
    C -->|backup due| D[Backup created in ...]
    C -->|not due| E[No autobackup needed yet...]
    D --> F[World save 1/5 ... Save number N]
    E --> F
    F --> G[World save 2/5 to 4/5]
    G --> H[World save 5/5 done. Total time]
```

| Event | Example | Regex |
| --- | --- | --- |
| Save started | ` ### Save World Thread Started! ### ` | `^ ### Save World Thread Started! ### $` |
| Save step | `World save (1/5) Cloud & Backup checks done [2ms] => Save number 1184` | `^World save \((?<step>\d)/5\) (?:(?<stepName>.+?) )?done(?:\. Total time)? \[(?<ms>\d+)ms\](?: => Save number (?<saveNumber>\d+))?$` |
| Backup check | `Considering autobackup for World. World time: 590.7997, short time: 7200, long time: 43200, backup count: 4` | `^Considering autobackup for World\. World time: (?<worldTime>[\d.]+), short time: (?<shortTime>\d+), long time: (?<longTime>\d+), backup count: (?<backupCount>\d+)$` |
| Backup skipped | `No autobackup needed yet...` | `^(?:Skipping backup\. World session not long enough\.\|No autobackup needed yet\.\.\.)$` |
| Backup replaced | `Replacing backup file: Cotil_backup_auto-20261029-031214` | `^Replacing backup file: (?<backup>\S+)$` |
| Backup created | `Backup created in Cotil_backup_auto-20261029-051215 [23.522ms]` | `^Backup created in (?<backup>\S+) \[(?<ms>[\d.]+)ms\]$` |
| Disk space | `Available space to current user: 278588960768. Saving is blocked if below: 14960956 bytes. Warnings are given if below: 29921912` | `^Available space to current user: (?<available>\d+)\. Saving is blocked if below: (?<blockedBelow>\d+) bytes\. Warnings are given if below: (?<warnBelow>\d+)$` |
| Crossplay dropped | `PlayFab network error in session 'Cotil' and network 1a03782b-...` | `^PlayFab network error in session ` |

- `World time` is in-game seconds. One in-game day is 1800 seconds, so day = `floor(worldTime / 1800) + 1`.
- No save line for more than about 10 minutes means the server was down.
- `\|` in a table cell is a plain `|` in the regex.

## Server start

| Event | Example | Regex |
| --- | --- | --- |
| Version | `Valheim version: 1.0.21 (network version 41)` | `^Valheim version: (?<version>[\d.]+) \(network version (?<network>\d+)\)$` |
| Modded | `isModded: False` | `^isModded: (?<isModded>True\|False)$` |
| World loaded | `ZNet.LoadWorld: Cotil (Cotil), save number 1183` | `^ZNet\.LoadWorld: (?<world>.+?) \((?<file>.+?)\), save number (?<saveNumber>\d+)$` |
| Join code | `Session "FlanServer" registered with join code 123456` | `^Session "(?<server>.+)" registered with join code (?<joinCode>\d+)$` |
| Server online | `Session "FlanServer" with join code 123456 and IP 203.0.113.10:2456 is active with 0 player(s)` | `^Session "(?<server>.+)" with join code (?<joinCode>\d+) and IP (?<ip>[\d.]+):(?<port>\d+) is active with (?<players>\d+) player\(s\)$` |
| Game server | `Game server connected` | `^Game server (?<state>connected\|disconnected)$` |

## Errors and other lines

Not game events. Keep them out of the timeline.

| Kind | Example |
| --- | --- |
| Unity startup warnings | `Shader 'Custom/Water': fallback shader 'Diffuse' not found` |
| Missing script | `The referenced script on this Behaviour (Game Object '<null>') is missing!` |
| Retries | `Sending PlayFab login request (attempt 2)` |
| PlayFab upkeep | `Update PlayFab entity token` |
| Save internals | `PrepareSave: ZDOExtraData.PrepareSave done [35ms]` |
| Low disk | Disk space line where `available` is under `warnBelow`. Saving stops under `blockedBelow`. |

## Sources

- [Valheim Wiki: Events](https://valheim.fandom.com/wiki/Events) (raid names, messages, unlocks)
- [Valheim Wiki: Global Keys](https://valheim.weirdgloop.org/w/Global_Keys) (boss keys)
- [Valheim Modding Wiki: Event System](https://github-wiki-see.page/m/Valheim-Modding/Wiki/wiki/Event-System) (raid key rules)
- [Steam discussion: raid timing](https://steamcommunity.com/app/892970/discussions/0/3826413850820704361) (`Possible events`, `Random event set` lines)
- [valheim-server-docker discussion #397](https://github.com/lloesche/valheim-server-docker/discussions/397) (death `0:0`, raid and leave lines)
- [valheim-server-docker discussion #519](https://github.com/lloesche/valheim-server-docker/discussions/519) (`Closing socket`, handshake)
- [Join and leave script](https://gist.github.com/KevinPayravi/fe33a9b7d1b17e2747908950aa7a12f7) (Steam-only join and leave lines)
- [Example server log](https://gist.github.com/kgadberry/8703f734e53b76862c7d62aca828d664) (`Got connection SteamID`, wrong password)
- [vh-notify-ts](https://github.com/Viapatis/vh-notify-ts) (closest full list: timeout, night skip, server stop, network trouble)
- [Valheim connection errors](https://valheimdb.com/multiplayer/connection-errors) (refused join lines)
- [valheim-notify](https://github.com/Whiskey24/valheim-notify) (`day:`, `OnApplicationQuit`, `Load world`, death `: 0:`)
- [vikings log parser](https://github.com/nickpelone/vikings) (`World saved ( Nms )`, Steam connect and leave)
- [valheim-discord-monitor PR #50](https://github.com/alainator/valheim-discord-monitor/pull/50) (boss keys in the `.db2` save)

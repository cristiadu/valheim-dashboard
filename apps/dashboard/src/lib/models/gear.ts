/** Quality at the end of a piece of gear the snapshot keeps, for example ` quality 2` in `SwordIron quality 2`. */
export const GEAR_QUALITY_PATTERN = / quality (\d+)$/;

/** Slots on a Vikings character sheet, in the order the sheet draws them. */
export const GEAR_SLOTS = ['head', 'weapon', 'chest', 'shield', 'cape', 'legs', 'utility'] as const;

/** One slot on the character sheet, for example `head`. */
export type GearSlot = (typeof GEAR_SLOTS)[number];

/** Name of each slot, shown in an empty slot and read out by screen readers. */
export const GEAR_SLOT_NAMES: Record<GearSlot, string> = {
  head: 'Head',
  weapon: 'Weapon',
  chest: 'Chest',
  shield: 'Shield',
  cape: 'Cape',
  legs: 'Legs',
  utility: 'Belt',
};

/**
 * Slot of a piece of gear by its prefab name, checked in order. Gear that matches none, such as the hammer,
 * the hoe or a torch, is carried and not worn.
 */
export const GEAR_SLOT_PATTERNS: readonly (readonly [RegExp, GearSlot])[] = [
  [/^Helmet/, 'head'],
  [/^Armor\w*(Chest|Cuirass)$/, 'chest'],
  [/^Armor\w*(Legs|Greaves)$/, 'legs'],
  [/^Cape/, 'cape'],
  [/^Shield/, 'shield'],
  [/^(Belt|Wishbone|Demister)/, 'utility'],
  [/^(Axe|Battleaxe|Sword|Mace|Club|Spear|Knife|Atgeir|Sledge|Bow|Crossbow|Staff|Fist)/, 'weapon'],
];

/**
 * Item names as the game shows them, by the prefab the plugin logs, for example `Flint spear` for `SpearFlint`.
 * The names also pick the icon. Gear missing here shows its prefab in plain words and no icon.
 */
export const GEAR_NAMES: Record<string, string> = {
  Club: 'Club',
  Torch: 'Torch',
  Hammer: 'Hammer',
  Hoe: 'Hoe',
  Cultivator: 'Cultivator',
  AxeStone: 'Stone axe',
  AxeFlint: 'Flint axe',
  AxeBronze: 'Bronze axe',
  AxeIron: 'Iron axe',
  AxeBlackMetal: 'Blackmetal axe',
  PickaxeAntler: 'Antler pickaxe',
  PickaxeBronze: 'Bronze pickaxe',
  PickaxeIron: 'Iron pickaxe',
  KnifeFlint: 'Flint knife',
  SpearFlint: 'Flint spear',
  SpearBronze: 'Bronze spear',
  SwordBronze: 'Bronze sword',
  SwordIron: 'Iron sword',
  SwordBlackmetal: 'Blackmetal sword',
  MaceBronze: 'Bronze mace',
  MaceIron: 'Iron mace',
  MaceSilver: 'Frostner',
  MaceNeedle: 'Porcupine',
  AtgeirBronze: 'Bronze atgeir',
  SledgeIron: 'Iron sledge',
  Bow: 'Crude bow',
  BowFineWood: 'Finewood bow',
  AxeWood: 'Wooden axe',
  KnifeWood: 'Wooden knife',
  SpearWood: 'Wooden spear',
  SwordWood: 'Wooden sword',
  FistBjornClaw: 'Paws of the Bear',
  BowHuntsman: 'Huntsman bow',
  BowDraugrFang: 'Draugr fang',
  ShieldWood: 'Wood shield',
  ShieldBronzeBuckler: 'Bronze buckler',
  ShieldBanded: 'Banded shield',
  ShieldBlackmetal: 'Blackmetal shield',
  HelmetLeather: 'Leather helmet',
  HelmetTrollLeather: 'Troll leather helmet',
  HelmetBronze: 'Bronze helmet',
  HelmetIron: 'Iron helmet',
  HelmetDrake: 'Drake helmet',
  HelmetPadded: 'Padded helmet',
  ArmorLeatherChest: 'Leather tunic',
  ArmorLeatherLegs: 'Leather pants',
  ArmorTrollLeatherChest: 'Troll leather tunic',
  ArmorTrollLeatherLegs: 'Troll leather pants',
  ArmorBronzeChest: 'Bronze plate cuirass',
  ArmorBronzeLegs: 'Bronze plate leggings',
  ArmorIronChest: 'Iron scale mail',
  ArmorIronLegs: 'Iron greaves',
  ArmorWolfChest: 'Wolf armor chest',
  ArmorWolfLegs: 'Wolf armor legs',
  ArmorPaddedCuirass: 'Padded cuirass',
  ArmorPaddedGreaves: 'Padded greaves',
  CapeDeerHide: 'Deer hide cape',
  CapeTrollHide: 'Troll hide cape',
  CapeWolf: 'Wolf fur cape',
  CapeLox: 'Lox cape',
  CapeLinen: 'Linen cape',
  BeltStrength: 'Megingjord',
  Wishbone: 'Wishbone',
  ShieldWoodTower: 'Wood tower shield',
  ShieldBoneTower: 'Bone tower shield',
  ShieldIronTower: 'Iron tower shield',
  SledgeStagbreaker: 'Stagbreaker',
  SpearElderbark: 'Ancient bark spear',
  ArmorRagsChest: 'Rag tunic',
  ArmorRagsLegs: 'Rag pants',
};

/** Where a piece of gear goes on the character sheet: a slot, or `carried` for tools and spare gear. */
export type GearPlace = GearSlot | 'carried';

/** One piece of gear the plugin logged. */
export type GearPiece = {
  /** Prefab the plugin logged, for example `SpearFlint`. */
  prefab: string;
  /** Name as the game shows it, for example `Flint spear`. */
  name: string;
  /** Upgrade level, 1 when never upgraded. */
  quality: number;
  /** Where it goes on the character sheet. */
  place: GearPlace;
};

/** A character's gear laid out like a character sheet. */
export type GearSheet = {
  /** Piece worn in each slot. Empty slots are missing. */
  worn: Partial<Record<GearSlot, GearPiece>>;
  /** Tools and spare pieces held now that have no slot of their own, such as a torch or the hammer. */
  held: GearPiece[];
};

/** Size of a gear icon in its slot, in pixels. */
export const GEAR_ICON_PX = 38;

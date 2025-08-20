// Player-related types
export interface Player {
  lordId: string;
  currentName: string;
  createdAt: Date;
  updatedAt: Date;
  hasLeftRealm: boolean;
  lastSeenAt: Date | null;
  leftRealmAt: Date | null;
}

export interface PlayerSnapshot {
  id: string;
  playerId: string;
  snapshotId: string;
  name: string;
  division: number;
  allianceId: string | null;
  allianceTag: string | null;
  currentPower: string;
  power: string;
  buildingPower: string;
  heroPower: string;
  legionPower: string;
  techPower: string;
  merits: string;
  unitsKilled: string;
  unitsDead: string;
  unitsHealed: string;
  t1KillCount: string;
  t2KillCount: string;
  t3KillCount: string;
  t4KillCount: string;
  t5KillCount: string;
  victories: number;
  defeats: number;
  citySieges: number;
  scouted: number;
  helpsGiven: number;
  resourcesGiven: string;
  resourcesGivenCount: number;
  gold: string;
  goldSpent: string;
  wood: string;
  woodSpent: string;
  ore: string;
  oreSpent: string;
  mana: string;
  manaSpent: string;
  gems: string;
  gemsSpent: string;
  cityLevel: number;
  faction: string | null;
}

export interface PlayerData extends PlayerSnapshot {
  rank?: number;
  killDeathRatio?: string | number;
  winRate?: string | number;
  totalCombats?: number;
}

export interface NameChange {
  id: string;
  playerId: string;
  oldName: string;
  newName: string;
  detectedAt: Date;
}

export interface AllianceChange {
  id: string;
  playerId: string;
  oldAlliance: string | null;
  oldAllianceId: string | null;
  newAlliance: string | null;
  newAllianceId: string | null;
  detectedAt: Date;
}

export interface PlayerWithHistory extends Player {
  nameHistory?: NameChange[];
  allianceHistory?: AllianceChange[];
  snapshots?: PlayerSnapshot[];
}

// Excel processing types
export interface ExcelPlayerData {
  lordId: string;
  name: string;
  division: number;
  allianceId: string | null;
  allianceTag: string | null;
  currentPower: string;
  power: string;
  buildingPower: string;
  heroPower: string;
  legionPower: string;
  techPower: string;
  merits: string;
  unitsKilled: string;
  unitsDead: string;
  unitsHealed: string;
  t1KillCount: string;
  t2KillCount: string;
  t3KillCount: string;
  t4KillCount: string;
  t5KillCount: string;
  victories: number;
  defeats: number;
  citySieges: number;
  scouted: number;
  helpsGiven: number;
  resourcesGiven: string;
  resourcesGivenCount: number;
  gold: string;
  goldSpent: string;
  wood: string;
  woodSpent: string;
  ore: string;
  oreSpent: string;
  mana: string;
  manaSpent: string;
  gems: string;
  gemsSpent: string;
  cityLevel: number;
  faction: string | null;
}

// Leaderboard types
export interface LeaderboardPlayer extends PlayerData {
  currentName: string;
  hasLeftRealm: boolean;
  lastSeenAt: Date | null;
  leftRealmAt: Date | null;
}

export interface LeaderboardFilters {
  sortBy?: string;
  order?: 'asc' | 'desc';
  alliance?: string;
  limit?: number;
  page?: number;
  seasonMode?: 'current' | 'all-time' | 'specific';
  seasonId?: string;
}
import { PlayerSnapshot, Player, NameChange, AllianceChange } from '@/types/player';
import { 
  PlayerListItemDto, 
  PlayerDetailDto, 
  PlayerHistoryDto,
  NameChangeDto,
  AllianceChangeDto,
  PlayerSnapshotDto
} from '@/types/dto';

export class PlayerMapper {
  /**
   * Convert PlayerSnapshot to PlayerListItemDto for list views
   */
  static toListItem(snapshot: PlayerSnapshot & { player?: Player }): PlayerListItemDto {
    return {
      lordId: snapshot.playerId,
      name: snapshot.name,
      division: snapshot.division,
      allianceTag: snapshot.allianceTag || null,
      currentPower: snapshot.currentPower || '0',
      power: snapshot.power || '0',
      merits: snapshot.merits || '0',
      cityLevel: snapshot.cityLevel || 0,
      faction: snapshot.faction || null,
      hasLeftRealm: snapshot.player?.hasLeftRealm,
      lastSeenAt: snapshot.player?.lastSeenAt?.toISOString()
    };
  }

  /**
   * Convert PlayerSnapshot to PlayerDetailDto for detailed views
   */
  static toDetail(snapshot: PlayerSnapshot & { player?: Player }): PlayerDetailDto {
    return {
      ...this.toListItem(snapshot),
      unitsKilled: snapshot.unitsKilled || '0',
      unitsDead: snapshot.unitsDead || '0',
      unitsHealed: snapshot.unitsHealed || '0',
      t1KillCount: snapshot.t1KillCount || '0',
      t2KillCount: snapshot.t2KillCount || '0',
      t3KillCount: snapshot.t3KillCount || '0',
      t4KillCount: snapshot.t4KillCount || '0',
      t5KillCount: snapshot.t5KillCount || '0',
      buildingPower: snapshot.buildingPower || '0',
      heroPower: snapshot.heroPower || '0',
      legionPower: snapshot.legionPower || '0',
      techPower: snapshot.techPower || '0',
      victories: snapshot.victories || 0,
      defeats: snapshot.defeats || 0,
      citySieges: snapshot.citySieges || 0,
      scouted: snapshot.scouted || 0,
      helpsGiven: snapshot.helpsGiven || 0,
      gold: snapshot.gold || '0',
      goldSpent: snapshot.goldSpent || '0',
      wood: snapshot.wood || '0',
      woodSpent: snapshot.woodSpent || '0',
      ore: snapshot.ore || '0',
      oreSpent: snapshot.oreSpent || '0',
      mana: snapshot.mana || '0',
      manaSpent: snapshot.manaSpent || '0',
      gems: snapshot.gems || '0',
      gemsSpent: snapshot.gemsSpent || '0',
      resourcesGiven: snapshot.resourcesGiven || '0',
      resourcesGivenCount: snapshot.resourcesGivenCount || 0,
      allianceId: snapshot.allianceId || null
    };
  }

  /**
   * Convert array of PlayerSnapshots to PlayerListItemDto array
   */
  static toListItems(snapshots: (PlayerSnapshot & { player?: Player })[]): PlayerListItemDto[] {
    return snapshots.map(snapshot => this.toListItem(snapshot));
  }

  /**
   * Convert Player with history to PlayerHistoryDto
   */
  static toHistory(
    player: Player & {
      nameHistory?: NameChange[];
      allianceHistory?: AllianceChange[];
      snapshots?: (PlayerSnapshot & { snapshot: { timestamp: Date } })[];
    },
    latestSnapshot?: PlayerSnapshot
  ): PlayerHistoryDto {
    const playerDetail = latestSnapshot 
      ? this.toDetail({ ...latestSnapshot, player })
      : {
          lordId: player.lordId,
          name: player.currentName,
          division: 0,
          allianceTag: null,
          currentPower: '0',
          power: '0',
          merits: '0',
          cityLevel: 0,
          faction: null,
          hasLeftRealm: player.hasLeftRealm,
          lastSeenAt: player.lastSeenAt?.toISOString()
        } as PlayerDetailDto;

    return {
      player: playerDetail,
      nameHistory: (player.nameHistory || []).map(this.toNameChange),
      allianceHistory: (player.allianceHistory || []).map(this.toAllianceChange),
      snapshots: (player.snapshots || []).map(s => this.toPlayerSnapshot(s))
    };
  }

  /**
   * Convert NameChange to NameChangeDto
   */
  static toNameChange(nameChange: NameChange): NameChangeDto {
    return {
      id: nameChange.id,
      oldName: nameChange.oldName,
      newName: nameChange.newName,
      detectedAt: nameChange.detectedAt.toISOString()
    };
  }

  /**
   * Convert AllianceChange to AllianceChangeDto
   */
  static toAllianceChange(allianceChange: AllianceChange): AllianceChangeDto {
    return {
      id: allianceChange.id,
      oldAlliance: allianceChange.oldAlliance,
      oldAllianceId: allianceChange.oldAllianceId,
      newAlliance: allianceChange.newAlliance,
      newAllianceId: allianceChange.newAllianceId,
      detectedAt: allianceChange.detectedAt.toISOString()
    };
  }

  /**
   * Convert PlayerSnapshot with snapshot info to PlayerSnapshotDto
   */
  static toPlayerSnapshot(
    playerSnapshot: PlayerSnapshot & { snapshot: { timestamp: Date; filename?: string; kingdom?: string } }
  ): PlayerSnapshotDto {
    return {
      id: playerSnapshot.id,
      timestamp: playerSnapshot.snapshot.timestamp.toISOString(),
      filename: playerSnapshot.snapshot.filename || 'unknown',
      kingdom: playerSnapshot.snapshot.kingdom || 'unknown',
      playerData: this.toDetail(playerSnapshot)
    };
  }

  /**
   * Calculate battle efficiency for a player
   */
  static calculateBattleEfficiency(snapshot: PlayerSnapshot): number {
    const unitsKilled = parseInt(snapshot.unitsKilled || '0');
    const unitsDead = parseInt(snapshot.unitsDead || '0');
    
    if (unitsDead === 0) return unitsKilled > 0 ? 100 : 0;
    return Math.round((unitsKilled / unitsDead) * 100) / 100;
  }

  /**
   * Calculate kill/death ratio
   */
  static calculateKillDeathRatio(snapshot: PlayerSnapshot): number {
    const victories = snapshot.victories || 0;
    const defeats = snapshot.defeats || 0;
    
    if (defeats === 0) return victories > 0 ? victories : 0;
    return Math.round((victories / defeats) * 100) / 100;
  }

  /**
   * Enrich player data with calculated metrics
   */
  static enrichWithMetrics(dto: PlayerDetailDto, snapshot: PlayerSnapshot): PlayerDetailDto & {
    battleEfficiency: number;
    killDeathRatio: number;
    powerRank?: number;
  } {
    return {
      ...dto,
      battleEfficiency: this.calculateBattleEfficiency(snapshot),
      killDeathRatio: this.calculateKillDeathRatio(snapshot)
    };
  }
}
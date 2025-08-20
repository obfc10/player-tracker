import { BaseService } from './BaseService';
import { PlayerRepository } from '@/repositories/PlayerRepository';
import { ExcelPlayerData, NameChange, AllianceChange } from '@/types/player';

export interface ChangeDetectionResult {
  nameChanges: number;
  allianceChanges: number;
  errors: Array<{ playerId: string; error: string }>;
}

export class ChangeDetectionService extends BaseService {
  constructor(private playerRepository: PlayerRepository) {
    super();
  }

  async detectAndProcessChanges(
    playersData: ExcelPlayerData[], 
    timestamp: Date
  ): Promise<ChangeDetectionResult> {
    this.logInfo('detectAndProcessChanges', `Processing changes for ${playersData.length} players`);
    
    let nameChanges = 0;
    let allianceChanges = 0;
    const errors: Array<{ playerId: string; error: string }> = [];

    for (const data of playersData) {
      try {
        // Get the most recent snapshot before this one
        const lastSnapshots = await this.playerRepository.getLatestSnapshots([data.lordId], timestamp);
        const lastSnapshot = lastSnapshots[0];

        if (lastSnapshot) {
          // Check for name changes
          if (await this.processNameChange(data, lastSnapshot, timestamp)) {
            nameChanges++;
          }

          // Check for alliance changes
          if (await this.processAllianceChange(data, lastSnapshot, timestamp)) {
            allianceChanges++;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logWarning('detectAndProcessChanges', `Error processing changes for player ${data.lordId}`, error);
        errors.push({ playerId: data.lordId, error: errorMessage });
      }
    }

    this.logInfo('detectAndProcessChanges', 
      `Processed changes: ${nameChanges} name changes, ${allianceChanges} alliance changes, ${errors.length} errors`
    );

    return {
      nameChanges,
      allianceChanges,
      errors
    };
  }

  private async processNameChange(
    currentData: ExcelPlayerData, 
    lastSnapshot: any, 
    timestamp: Date
  ): Promise<boolean> {
    if (lastSnapshot.name !== currentData.name) {
      await this.playerRepository.createNameChange({
        playerId: currentData.lordId,
        oldName: lastSnapshot.name,
        newName: currentData.name,
        detectedAt: timestamp
      });
      return true;
    }
    return false;
  }

  private async processAllianceChange(
    currentData: ExcelPlayerData, 
    lastSnapshot: any, 
    timestamp: Date
  ): Promise<boolean> {
    const oldAlliance = lastSnapshot.allianceTag || null;
    const newAlliance = currentData.allianceTag || null;
    
    if (oldAlliance !== newAlliance) {
      await this.playerRepository.createAllianceChange({
        playerId: currentData.lordId,
        oldAlliance: oldAlliance,
        oldAllianceId: lastSnapshot.allianceId,
        newAlliance: newAlliance,
        newAllianceId: currentData.allianceId,
        detectedAt: timestamp
      });
      return true;
    }
    return false;
  }

  async processRealmStatus(
    currentPlayerIds: string[], 
    timestamp: Date, 
    powerFloor: number = 10000000
  ): Promise<number> {
    this.logInfo('processRealmStatus', 'Checking for players who may have left the realm');
    
    try {
      // Get cutoff date (7 days ago) for considering someone as "left"
      const leftRealmCutoff = new Date(timestamp.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      // Find players who haven't appeared in the last 7 days but were active before
      const playersToMarkAsLeft = await this.playerRepository.findAbsentPlayers(
        currentPlayerIds, 
        leftRealmCutoff, 
        powerFloor
      );

      // Filter to only include players who had sufficient power when last seen
      const significantPlayersToMarkAsLeft = playersToMarkAsLeft.filter(player => {
        const lastSnapshot = player.snapshots?.[0];
        if (!lastSnapshot) return false;
        
        const lastPower = parseInt(lastSnapshot.currentPower || '0');
        return lastPower >= powerFloor;
      });
      
      this.logInfo('processRealmStatus', 
        `Found ${playersToMarkAsLeft.length} absent players, ${significantPlayersToMarkAsLeft.length} with ${powerFloor.toLocaleString()}+ power`
      );
      
      if (significantPlayersToMarkAsLeft.length > 0) {
        const lordIds = significantPlayersToMarkAsLeft.map(p => p.lordId);
        const markedCount = await this.playerRepository.markPlayersAsLeft(lordIds, timestamp);
        
        this.logInfo('processRealmStatus', 
          `Marked ${markedCount} players as having left the realm (${powerFloor.toLocaleString()}+ power floor)`
        );
        
        return markedCount;
      }
      
      return 0;
    } catch (error) {
      this.handleError(error, 'processRealmStatus');
    }
  }
}
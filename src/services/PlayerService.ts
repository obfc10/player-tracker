import { BaseService } from './BaseService';
import { PlayerRepository, SnapshotRepository } from '@/repositories';
import { ExcelProcessingService, ProcessedExcelData } from './ExcelProcessingService';
import { ChangeDetectionService, ChangeDetectionResult } from './ChangeDetectionService';
import { ProcessedSnapshot } from '@/types/snapshot';
import { ExcelPlayerData } from '@/types/player';
import { getConfig } from '@/lib/config';

export interface UploadProcessingResult {
  success: true;
  snapshot: ProcessedSnapshot;
  message: string;
}

export class PlayerService extends BaseService {
  private playerRepository: PlayerRepository;
  private snapshotRepository: SnapshotRepository;
  private excelService: ExcelProcessingService;
  private changeDetectionService: ChangeDetectionService;
  private config = getConfig('database');

  constructor() {
    super();
    this.playerRepository = new PlayerRepository();
    this.snapshotRepository = new SnapshotRepository();
    this.excelService = new ExcelProcessingService();
    this.changeDetectionService = new ChangeDetectionService(this.playerRepository);
  }

  async processUpload(file: File, uploadId: string): Promise<UploadProcessingResult> {
    try {
      this.logInfo('processUpload', `Starting upload processing for file: ${file.name}`);
      
      // Step 1: Process Excel file
      const excelData = await this.excelService.processExcelFile(file);
      
      // Step 2: Create snapshot
      const snapshot = await this.snapshotRepository.create({
        timestamp: excelData.fileInfo.timestamp,
        filename: excelData.fileInfo.filename,
        kingdom: excelData.fileInfo.kingdom,
        uploadId,
        seasonId: null // TODO: Add season detection logic
      });

      // Step 3: Process players in batches
      await this.processPlayersInBatches(excelData.players, excelData.fileInfo.timestamp);
      
      // Step 4: Create player snapshots
      await this.snapshotRepository.createPlayerSnapshots(snapshot.id, excelData.players);
      
      // Step 5: Detect and process changes
      const changeResults = await this.changeDetectionService.detectAndProcessChanges(
        excelData.players, 
        excelData.fileInfo.timestamp
      );
      
      // Step 6: Verify and fix player name consistency
      await this.verifyPlayerNameConsistency(excelData.players);
      
      // Step 7: Process realm status
      const currentPlayerIds = excelData.players.map(p => p.lordId);
      const playersMarkedAsLeft = await this.changeDetectionService.processRealmStatus(
        currentPlayerIds, 
        excelData.fileInfo.timestamp
      );
      
      const result: ProcessedSnapshot = {
        snapshot,
        playersProcessed: excelData.rowCount,
        changesDetected: {
          nameChanges: changeResults.nameChanges,
          allianceChanges: changeResults.allianceChanges
        },
        playersMarkedAsLeft
      };
      
      this.logInfo('processUpload', 'Upload processing completed successfully', {
        playersProcessed: result.playersProcessed,
        changesDetected: result.changesDetected,
        playersMarkedAsLeft: result.playersMarkedAsLeft
      });
      
      return {
        success: true,
        snapshot: result,
        message: `Successfully processed ${result.playersProcessed} players`
      };
      
    } catch (error) {
      this.handleError(error, 'processUpload');
    }
  }

  private async processPlayersInBatches(players: ExcelPlayerData[], timestamp: Date): Promise<void> {
    const batchSize = this.config.batchSize;
    this.logInfo('processPlayersInBatches', `Processing ${players.length} players in batches of ${batchSize}`);
    
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      this.logInfo('processPlayersInBatches',
        `Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(players.length/batchSize)}`
      );
      
      // Process each player in the batch
      for (const playerData of batch) {
        try {
          await this.playerRepository.upsert(playerData.lordId, {
            currentName: playerData.name,
            lastSeenAt: timestamp,
            hasLeftRealm: false, // Reset if they appear in new data
            leftRealmAt: null    // Clear if they're back
          });
        } catch (error) {
          this.logWarning('processPlayersInBatches',
            `Error processing player ${playerData.lordId}`, error
          );
          // Continue with other players
        }
      }
    }
  }

  private async verifyPlayerNameConsistency(players: ExcelPlayerData[]): Promise<void> {
    this.logInfo('verifyPlayerNameConsistency', 'Verifying player currentName consistency');
    let nameFixCount = 0;
    
    for (const data of players) {
      try {
        const player = await this.playerRepository.findByLordId(data.lordId);
        
        if (player && player.currentName !== data.name) {
          this.logInfo('verifyPlayerNameConsistency', 
            `Fixing player ${data.lordId} name: "${player.currentName}" -> "${data.name}"`
          );
          
          await this.playerRepository.upsert(data.lordId, {
            currentName: data.name
          });
          nameFixCount++;
        }
      } catch (error) {
        this.logWarning('verifyPlayerNameConsistency', 
          `Error verifying player ${data.lordId}`, error
        );
      }
    }
    
    this.logInfo('verifyPlayerNameConsistency', `Fixed ${nameFixCount} player name inconsistencies`);
  }

  async getPlayerById(lordId: string) {
    try {
      return await this.playerRepository.findByLordIdWithHistory(lordId);
    } catch (error) {
      this.handleError(error, 'getPlayerById');
    }
  }

  async getAllPlayers(includeLeftRealm: boolean = false) {
    try {
      // Get latest snapshot
      const latestSnapshot = await this.snapshotRepository.findLatest();
      if (!latestSnapshot) {
        return { players: [] };
      }

      // Get player snapshots
      const playerSnapshots = await this.snapshotRepository.getPlayerSnapshotsFiltered(
        latestSnapshot.id,
        { includeLeftRealm }
      );

      // Transform to match expected format
      const transformedPlayers = playerSnapshots.map((snapshot: any) => ({
        lordId: snapshot.playerId,
        name: snapshot.name,
        division: snapshot.division,
        allianceTag: snapshot.allianceTag || '',
        currentPower: snapshot.currentPower || '0',
        power: snapshot.power || '0',
        merits: snapshot.merits || '0',
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
        cityLevel: snapshot.cityLevel || 0,
        faction: snapshot.faction || ''
      }));

      return { players: transformedPlayers };
    } catch (error) {
      this.handleError(error, 'getAllPlayers');
    }
  }
}
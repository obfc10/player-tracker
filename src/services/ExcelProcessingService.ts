import * as ExcelJS from 'exceljs';
import { BaseService } from './BaseService';
import { ExcelPlayerData } from '@/types/player';
import { ValidationError } from '@/types/api';

export interface ExcelFileInfo {
  kingdom: string;
  timestamp: Date;
  filename: string;
}

export interface ProcessedExcelData {
  fileInfo: ExcelFileInfo;
  players: ExcelPlayerData[];
  rowCount: number;
}

// Column mapping for the 39 fields
const COLUMN_MAP = {
  lordId: 1,
  name: 2,
  division: 3,
  allianceId: 4,
  allianceTag: 5,
  currentPower: 6,
  power: 7,
  merits: 8,
  unitsKilled: 9,
  unitsDead: 10,
  unitsHealed: 11,
  t1KillCount: 12,
  t2KillCount: 13,
  t3KillCount: 14,
  t4KillCount: 15,
  t5KillCount: 16,
  buildingPower: 17,
  heroPower: 18,
  legionPower: 19,
  techPower: 20,
  victories: 21,
  defeats: 22,
  citySieges: 23,
  scouted: 24,
  helpsGiven: 25,
  gold: 26,
  goldSpent: 27,
  wood: 28,
  woodSpent: 29,
  ore: 30,
  oreSpent: 31,
  mana: 32,
  manaSpent: 33,
  gems: 34,
  gemsSpent: 35,
  resourcesGiven: 36,
  resourcesGivenCount: 37,
  cityLevel: 38,
  faction: 39
};

export class ExcelProcessingService extends BaseService {
  async processExcelFile(file: File): Promise<ProcessedExcelData> {
    try {
      this.logInfo('processExcelFile', `Processing file: ${file.name}`);
      
      // Parse and validate filename
      const fileInfo = this.parseFilename(file.name);
      
      // Process Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      // Find the correct worksheet
      const worksheet = this.findDataWorksheet(workbook, fileInfo.kingdom);
      
      // Extract player data
      const players = this.extractPlayerData(worksheet);
      
      this.logInfo('processExcelFile', `Successfully processed ${players.length} players`);
      
      return {
        fileInfo,
        players,
        rowCount: players.length
      };
    } catch (error) {
      this.handleError(error, 'processExcelFile');
    }
  }

  private parseFilename(filename: string): ExcelFileInfo {
    // Parse filename: 671_20250810_2040utc.xlsx
    const filenameRegex = /(\d+)_(\d{8})_(\d{4})utc/i;
    const match = filename.match(filenameRegex);
    
    if (!match) {
      throw new ValidationError(
        'Invalid filename format. Expected: 671_YYYYMMDD_HHMMutc.xlsx',
        { filename }
      );
    }

    const [, kingdom, dateStr, timeStr] = match;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(timeStr.substring(0, 2));
    const minute = parseInt(timeStr.substring(2, 4));
    
    const timestamp = new Date(Date.UTC(year, month, day, hour, minute));

    return {
      kingdom,
      timestamp,
      filename
    };
  }

  private findDataWorksheet(workbook: ExcelJS.Workbook, kingdom: string): ExcelJS.Worksheet {
    // Try to find the worksheet - could be kingdom number or "671"
    let worksheet = workbook.getWorksheet(kingdom);
    if (!worksheet) {
      // Try common sheet names
      worksheet = workbook.getWorksheet('671') || 
                 workbook.getWorksheet('Data') || 
                 workbook.worksheets[2]; // Often the third sheet
    }
    
    if (!worksheet) {
      throw new ValidationError(
        `Cannot find data worksheet. Looked for: ${kingdom}, 671, Data`,
        { availableSheets: workbook.worksheets.map(ws => ws.name) }
      );
    }

    return worksheet;
  }

  private extractPlayerData(worksheet: ExcelJS.Worksheet): ExcelPlayerData[] {
    const players: ExcelPlayerData[] = [];
    let processedRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 2) return; // Skip header row
      
      const lordId = this.getStringValue(row, COLUMN_MAP.lordId);
      if (!lordId) return; // Skip empty rows
      
      try {
        const playerData: ExcelPlayerData = {
          lordId,
          name: this.getStringValue(row, COLUMN_MAP.name),
          division: this.getNumberValue(row, COLUMN_MAP.division),
          allianceId: this.getStringValue(row, COLUMN_MAP.allianceId) || null,
          allianceTag: this.getStringValue(row, COLUMN_MAP.allianceTag) || null,
          
          // Store large numbers as strings
          currentPower: this.getBigNumberAsString(row, COLUMN_MAP.currentPower),
          power: this.getBigNumberAsString(row, COLUMN_MAP.power),
          buildingPower: this.getBigNumberAsString(row, COLUMN_MAP.buildingPower),
          heroPower: this.getBigNumberAsString(row, COLUMN_MAP.heroPower),
          legionPower: this.getBigNumberAsString(row, COLUMN_MAP.legionPower),
          techPower: this.getBigNumberAsString(row, COLUMN_MAP.techPower),
          
          // Combat stats
          merits: this.getBigNumberAsString(row, COLUMN_MAP.merits),
          unitsKilled: this.getBigNumberAsString(row, COLUMN_MAP.unitsKilled),
          unitsDead: this.getBigNumberAsString(row, COLUMN_MAP.unitsDead),
          unitsHealed: this.getBigNumberAsString(row, COLUMN_MAP.unitsHealed),
          t1KillCount: this.getBigNumberAsString(row, COLUMN_MAP.t1KillCount),
          t2KillCount: this.getBigNumberAsString(row, COLUMN_MAP.t2KillCount),
          t3KillCount: this.getBigNumberAsString(row, COLUMN_MAP.t3KillCount),
          t4KillCount: this.getBigNumberAsString(row, COLUMN_MAP.t4KillCount),
          t5KillCount: this.getBigNumberAsString(row, COLUMN_MAP.t5KillCount),
          
          // Battle stats
          victories: this.getNumberValue(row, COLUMN_MAP.victories),
          defeats: this.getNumberValue(row, COLUMN_MAP.defeats),
          citySieges: this.getNumberValue(row, COLUMN_MAP.citySieges),
          scouted: this.getNumberValue(row, COLUMN_MAP.scouted),
          
          // Alliance activity
          helpsGiven: this.getNumberValue(row, COLUMN_MAP.helpsGiven),
          resourcesGiven: this.getBigNumberAsString(row, COLUMN_MAP.resourcesGiven),
          resourcesGivenCount: this.getNumberValue(row, COLUMN_MAP.resourcesGivenCount),
          
          // Resources
          gold: this.getBigNumberAsString(row, COLUMN_MAP.gold),
          goldSpent: this.getBigNumberAsString(row, COLUMN_MAP.goldSpent),
          wood: this.getBigNumberAsString(row, COLUMN_MAP.wood),
          woodSpent: this.getBigNumberAsString(row, COLUMN_MAP.woodSpent),
          ore: this.getBigNumberAsString(row, COLUMN_MAP.ore),
          oreSpent: this.getBigNumberAsString(row, COLUMN_MAP.oreSpent),
          mana: this.getBigNumberAsString(row, COLUMN_MAP.mana),
          manaSpent: this.getBigNumberAsString(row, COLUMN_MAP.manaSpent),
          gems: this.getBigNumberAsString(row, COLUMN_MAP.gems),
          gemsSpent: this.getBigNumberAsString(row, COLUMN_MAP.gemsSpent),
          
          // Player info
          cityLevel: this.getNumberValue(row, COLUMN_MAP.cityLevel),
          faction: this.getStringValue(row, COLUMN_MAP.faction) || null
        };
        
        players.push(playerData);
        processedRows++;
      } catch (error) {
        this.logWarning('extractPlayerData', `Error processing row ${rowNumber} for player ${lordId}`, error);
        // Continue with other players rather than failing completely
      }
    });

    if (players.length === 0) {
      throw new ValidationError('No valid player data found in Excel file');
    }

    this.logInfo('extractPlayerData', `Extracted ${players.length} valid players from ${processedRows} rows`);
    return players;
  }

  // Helper functions for safe value extraction
  private getCellValue(row: ExcelJS.Row, col: number): string {
    const cell = row.getCell(col);
    if (cell.value === null || cell.value === undefined) return '';
    
    // Handle different cell value types
    if (typeof cell.value === 'object' && 'text' in cell.value) {
      return String(cell.value.text);
    }
    return String(cell.value);
  }

  private getStringValue(row: ExcelJS.Row, col: number): string {
    return this.getCellValue(row, col).trim();
  }

  private getNumberValue(row: ExcelJS.Row, col: number): number {
    const val = this.getCellValue(row, col);
    const num = parseInt(val.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }

  private getBigNumberAsString(row: ExcelJS.Row, col: number): string {
    const val = this.getCellValue(row, col).replace(/,/g, '');
    return val || '0';
  }
}
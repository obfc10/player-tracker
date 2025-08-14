// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse filename: 671_20250810_2040utc.xlsx
    const filenameRegex = /(\d+)_(\d{8})_(\d{4})utc/i;
    const match = file.name.match(filenameRegex);
    
    if (!match) {
      return NextResponse.json({ 
        error: 'Invalid filename format. Expected: 671_YYYYMMDD_HHMMutc.xlsx' 
      }, { status: 400 });
    }

    const [, kingdom, dateStr, timeStr] = match;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(timeStr.substring(0, 2));
    const minute = parseInt(timeStr.substring(2, 4));
    
    const timestamp = new Date(Date.UTC(year, month, day, hour, minute));

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        filename: file.name,
        userId: session.user.id,
        status: 'PROCESSING'
      }
    });

    try {
      // Process Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      // Try to find the worksheet - could be kingdom number or "671"
      let worksheet = workbook.getWorksheet(kingdom);
      if (!worksheet) {
        // Try common sheet names
        worksheet = workbook.getWorksheet('671') || 
                   workbook.getWorksheet('Data') || 
                   workbook.worksheets[2]; // Often the third sheet
      }
      
      if (!worksheet) {
        throw new Error(`Cannot find data worksheet. Looked for: ${kingdom}, 671, Data`);
      }

      // Create snapshot
      const snapshot = await prisma.snapshot.create({
        data: {
          timestamp,
          filename: file.name,
          kingdom: kingdom,
          uploadId: upload.id
        }
      });

      // Helper functions for safe value extraction
      const getCellValue = (row: ExcelJS.Row, col: number): string => {
        const cell = row.getCell(col);
        if (cell.value === null || cell.value === undefined) return '';
        
        // Handle different cell value types
        if (typeof cell.value === 'object' && 'text' in cell.value) {
          return String(cell.value.text);
        }
        return String(cell.value);
      };

      const getStringValue = (row: ExcelJS.Row, col: number): string => {
        return getCellValue(row, col).trim();
      };

      const getNumberValue = (row: ExcelJS.Row, col: number): number => {
        const val = getCellValue(row, col);
        const num = parseInt(val.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };

      const getBigNumberAsString = (row: ExcelJS.Row, col: number): string => {
        const val = getCellValue(row, col).replace(/,/g, '');
        return val || '0';
      };

      // Process rows
      const rows: any[] = [];
      let rowCount = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < 2) return; // Skip header row
        
        const lordId = getStringValue(row, COLUMN_MAP.lordId);
        if (!lordId) return; // Skip empty rows
        
        const playerData = {
          lordId,
          name: getStringValue(row, COLUMN_MAP.name),
          division: getNumberValue(row, COLUMN_MAP.division),
          allianceId: getStringValue(row, COLUMN_MAP.allianceId) || null,
          allianceTag: getStringValue(row, COLUMN_MAP.allianceTag) || null,
          
          // Store large numbers as strings
          currentPower: getBigNumberAsString(row, COLUMN_MAP.currentPower),
          power: getBigNumberAsString(row, COLUMN_MAP.power),
          buildingPower: getBigNumberAsString(row, COLUMN_MAP.buildingPower),
          heroPower: getBigNumberAsString(row, COLUMN_MAP.heroPower),
          legionPower: getBigNumberAsString(row, COLUMN_MAP.legionPower),
          techPower: getBigNumberAsString(row, COLUMN_MAP.techPower),
          
          // Combat stats
          merits: getBigNumberAsString(row, COLUMN_MAP.merits),
          unitsKilled: getBigNumberAsString(row, COLUMN_MAP.unitsKilled),
          unitsDead: getBigNumberAsString(row, COLUMN_MAP.unitsDead),
          unitsHealed: getBigNumberAsString(row, COLUMN_MAP.unitsHealed),
          t1KillCount: getBigNumberAsString(row, COLUMN_MAP.t1KillCount),
          t2KillCount: getBigNumberAsString(row, COLUMN_MAP.t2KillCount),
          t3KillCount: getBigNumberAsString(row, COLUMN_MAP.t3KillCount),
          t4KillCount: getBigNumberAsString(row, COLUMN_MAP.t4KillCount),
          t5KillCount: getBigNumberAsString(row, COLUMN_MAP.t5KillCount),
          
          // Battle stats
          victories: getNumberValue(row, COLUMN_MAP.victories),
          defeats: getNumberValue(row, COLUMN_MAP.defeats),
          citySieges: getNumberValue(row, COLUMN_MAP.citySieges),
          scouted: getNumberValue(row, COLUMN_MAP.scouted),
          
          // Alliance activity
          helpsGiven: getNumberValue(row, COLUMN_MAP.helpsGiven),
          resourcesGiven: getBigNumberAsString(row, COLUMN_MAP.resourcesGiven),
          resourcesGivenCount: getNumberValue(row, COLUMN_MAP.resourcesGivenCount),
          
          // Resources
          gold: getBigNumberAsString(row, COLUMN_MAP.gold),
          goldSpent: getBigNumberAsString(row, COLUMN_MAP.goldSpent),
          wood: getBigNumberAsString(row, COLUMN_MAP.wood),
          woodSpent: getBigNumberAsString(row, COLUMN_MAP.woodSpent),
          ore: getBigNumberAsString(row, COLUMN_MAP.ore),
          oreSpent: getBigNumberAsString(row, COLUMN_MAP.oreSpent),
          mana: getBigNumberAsString(row, COLUMN_MAP.mana),
          manaSpent: getBigNumberAsString(row, COLUMN_MAP.manaSpent),
          gems: getBigNumberAsString(row, COLUMN_MAP.gems),
          gemsSpent: getBigNumberAsString(row, COLUMN_MAP.gemsSpent),
          
          // Player info
          cityLevel: getNumberValue(row, COLUMN_MAP.cityLevel),
          faction: getStringValue(row, COLUMN_MAP.faction) || null
        };
        
        rows.push(playerData);
        rowCount++;
      });

      // Process in batches for better performance
      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        await prisma.$transaction(async (tx: any) => {
          for (const data of batch) {
            // Upsert player
            const player = await tx.player.upsert({
              where: { lordId: data.lordId },
              update: { currentName: data.name },
              create: { lordId: data.lordId, currentName: data.name }
            });

            // Check for name changes
            const lastSnapshot = await tx.playerSnapshot.findFirst({
              where: { playerId: data.lordId },
              orderBy: { snapshot: { timestamp: 'desc' } },
              include: { snapshot: true }
            });

            if (lastSnapshot && lastSnapshot.name !== data.name) {
              await tx.nameChange.create({
                data: {
                  playerId: data.lordId,
                  oldName: lastSnapshot.name,
                  newName: data.name,
                  detectedAt: timestamp
                }
              });
            }

            // Check for alliance changes
            if (lastSnapshot) {
              const oldAlliance = lastSnapshot.allianceTag || null;
              const newAlliance = data.allianceTag || null;
              
              if (oldAlliance !== newAlliance) {
                await tx.allianceChange.create({
                  data: {
                    playerId: data.lordId,
                    oldAlliance: oldAlliance,
                    oldAllianceId: lastSnapshot.allianceId,
                    newAlliance: newAlliance,
                    newAllianceId: data.allianceId,
                    detectedAt: timestamp
                  }
                });
              }
            }

            // Create player snapshot with all 39 fields
            const { lordId, ...snapshotData } = data; // Remove lordId from data
            await tx.playerSnapshot.create({
              data: {
                playerId: data.lordId,
                snapshotId: snapshot.id,
                ...snapshotData
              }
            });
          }
        });
      }

      // Update upload status
      await prisma.upload.update({
        where: { id: upload.id },
        data: { 
          status: 'COMPLETED',
          rowsProcessed: rowCount
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Successfully processed ${rowCount} players`,
        snapshotId: snapshot.id,
        timestamp: timestamp.toISOString(),
        rowsProcessed: rowCount
      });

    } catch (error) {
      // Update upload with error
      await prisma.upload.update({
        where: { id: upload.id },
        data: { 
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Processing failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
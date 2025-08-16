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
    // Debug logging
    console.log('Session user ID:', session.user.id);
    console.log('Session user username:', session.user.username);
    
    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!dbUser) {
      console.error('User not found in database with ID:', session.user.id);
      // Try to find by username as fallback
      const userByUsername = await prisma.user.findUnique({
        where: { username: session.user.username! }
      });
      
      if (userByUsername) {
        console.log('Found user by username, using ID:', userByUsername.id);
        // Update session for consistency (though this won't persist)
        session.user.id = userByUsername.id;
      } else {
        return NextResponse.json(
          { error: 'User not found in database. Please log out and log back in.' },
          { status: 401 }
        );
      }
    }

    console.log('Creating upload for verified user:', session.user.id);
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

      // Step 1: Upsert all players in batches (no complex queries)
      const BATCH_SIZE = 20; // Smaller batches to prevent timeouts
      console.log(`Processing ${rows.length} players in batches of ${BATCH_SIZE}...`);
      
      // Track which players we've updated for debugging
      const updatedPlayers = new Set();
      
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(rows.length/BATCH_SIZE)}`);
        
        // Simple transaction: just upsert players with realm status tracking
        await prisma.$transaction(async (tx: any) => {
          for (const data of batch) {
            console.log(`Updating player ${data.lordId} name to: ${data.name}`);
            await tx.player.upsert({
              where: { lordId: data.lordId },
              update: { 
                currentName: data.name,
                lastSeenAt: timestamp,
                hasLeftRealm: false, // Reset if they appear in new data
                leftRealmAt: null    // Clear if they're back
              },
              create: { 
                lordId: data.lordId, 
                currentName: data.name,
                lastSeenAt: timestamp
              }
            });
            updatedPlayers.add(data.lordId);
          }
        }, {
          maxWait: 10000, // 10 seconds
          timeout: 30000, // 30 seconds
        });
      }

      // Step 2: Create all snapshots in batches (no complex lookups)
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        await prisma.$transaction(async (tx: any) => {
          for (const data of batch) {
            const { lordId, ...snapshotData } = data;
            await tx.playerSnapshot.create({
              data: {
                playerId: data.lordId,
                snapshotId: snapshot.id,
                ...snapshotData
              }
            });
          }
        }, {
          maxWait: 10000, // 10 seconds
          timeout: 30000, // 30 seconds
        });
      }

      // Step 3: Process name and alliance changes (after all data is inserted)
      console.log('Processing name and alliance changes...');
      let changesProcessed = 0;
      for (const data of rows) {
        try {
          // Get the most recent snapshot before this one (outside transaction)
          const lastSnapshot = await prisma.playerSnapshot.findFirst({
            where: { 
              playerId: data.lordId,
              snapshot: { timestamp: { lt: timestamp } } // Before this upload
            },
            orderBy: { snapshot: { timestamp: 'desc' } },
            include: { snapshot: true }
          });

          if (lastSnapshot) {
            // Check for name changes
            if (lastSnapshot.name !== data.name) {
              await prisma.nameChange.create({
                data: {
                  playerId: data.lordId,
                  oldName: lastSnapshot.name,
                  newName: data.name,
                  detectedAt: timestamp
                }
              });
            }

            // Check for alliance changes
            const oldAlliance = lastSnapshot.allianceTag || null;
            const newAlliance = data.allianceTag || null;
            
            if (oldAlliance !== newAlliance) {
              await prisma.allianceChange.create({
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
          changesProcessed++;
        } catch (error) {
          console.error(`Error processing changes for player ${data.lordId}:`, error);
          // Continue with other players
        }
      }
      console.log(`Processed changes for ${changesProcessed}/${rows.length} players`);
      
      // Step 3.5: Verify and fix any player currentName inconsistencies
      console.log('Verifying player currentName consistency...');
      let nameFixCount = 0;
      for (const data of rows) {
        const player = await prisma.player.findUnique({
          where: { lordId: data.lordId }
        });
        
        if (player && player.currentName !== data.name) {
          console.log(`Fixing player ${data.lordId} name: "${player.currentName}" -> "${data.name}"`);
          await prisma.player.update({
            where: { lordId: data.lordId },
            data: { currentName: data.name }
          });
          nameFixCount++;
        }
      }
      console.log(`Fixed ${nameFixCount} player name inconsistencies`);
      
      // Step 4: Mark players as "left realm" if they haven't been seen in recent snapshots
      console.log('Checking for players who may have left the realm...');
      const currentPlayerIds = rows.map(data => data.lordId);
      
      // Get cutoff date (7 days ago) for considering someone as "left"
      const leftRealmCutoff = new Date(timestamp.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      // Find players who haven't appeared in the last 7 days but were active before
      // Only consider players who had significant power (10M+) to avoid marking low-power 
      // players who just dropped below export threshold
      const playersToMarkAsLeft = await prisma.player.findMany({
        where: {
          AND: [
            { lordId: { notIn: currentPlayerIds } }, // Not in current upload
            { hasLeftRealm: false }, // Not already marked as left
            { lastSeenAt: { lt: leftRealmCutoff } }, // Last seen more than 7 days ago
            { lastSeenAt: { not: null } } // Must have been seen before
          ]
        },
        include: {
          snapshots: {
            orderBy: { snapshot: { timestamp: 'desc' } },
            take: 1, // Get their most recent snapshot to check power
            include: { snapshot: true }
          }
        }
      });

      // Filter to only include players who had 10M+ power when last seen
      const POWER_FLOOR = 10000000; // 10 million power
      const significantPlayersToMarkAsLeft = playersToMarkAsLeft.filter(player => {
        const lastSnapshot = player.snapshots[0];
        if (!lastSnapshot) return false;
        
        const lastPower = parseInt(lastSnapshot.currentPower || '0');
        return lastPower >= POWER_FLOOR;
      });
      
      console.log(`Found ${playersToMarkAsLeft.length} absent players, ${significantPlayersToMarkAsLeft.length} with 10M+ power`);
      
      if (significantPlayersToMarkAsLeft.length > 0) {
        console.log(`Marking ${significantPlayersToMarkAsLeft.length} players as having left the realm (10M+ power floor)`);
        await prisma.player.updateMany({
          where: {
            lordId: { in: significantPlayersToMarkAsLeft.map(p => p.lordId) }
          },
          data: {
            hasLeftRealm: true,
            leftRealmAt: timestamp
          }
        });
      }
      
      console.log('Upload processing completed successfully');

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
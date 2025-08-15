import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'currentPower';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const alliance = searchParams.get('alliance') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Get the latest snapshot to work with current data
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        players: [],
        totalPlayers: 0,
        currentPage: 1,
        totalPages: 0,
        alliances: []
      });
    }

    // Build the where clause for alliance filtering
    const whereClause: any = {
      snapshotId: latestSnapshot.id
    };

    if (alliance !== 'all') {
      whereClause.allianceTag = alliance;
    }

    // Define if field needs numeric sorting (stored as String but should sort numerically)
    const isNumericStringField = (field: string): boolean => {
      return ['currentPower', 'power', 'merits', 'unitsKilled', 'unitsDead', 'unitsHealed', 
              'buildingPower', 'heroPower', 'legionPower', 'techPower', 'gold', 'wood', 
              'ore', 'mana', 'gems'].includes(field);
    };

    // Get total count for pagination
    const totalPlayers = await prisma.playerSnapshot.count({
      where: whereClause
    });

    // Build the query with proper numeric sorting for string fields
    let players;
    
    if (isNumericStringField(sortBy)) {
      // Use safe parameterized raw SQL for numeric sorting on string fields
      const sortDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      if (alliance !== 'all') {
        // With alliance filter
        const rawPlayers = await prisma.$queryRaw`
          SELECT ps.*, p."currentName", p."currentAlliance"
          FROM "PlayerSnapshot" ps
          JOIN "Player" p ON ps."playerId" = p."lordId"
          WHERE ps."snapshotId" = ${latestSnapshot.id}
          AND ps."allianceTag" = ${alliance}
          ORDER BY CAST(ps.${Prisma.raw(`"${sortBy}"`)} AS BIGINT) ${Prisma.raw(sortDirection)}
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        ` as any[];
        
        players = rawPlayers.map((row: any) => ({
          ...row,
          player: {
            currentName: row.currentName,
            currentAlliance: row.currentAlliance
          }
        }));
      } else {
        // Without alliance filter
        const rawPlayers = await prisma.$queryRaw`
          SELECT ps.*, p."currentName", p."currentAlliance"
          FROM "PlayerSnapshot" ps
          JOIN "Player" p ON ps."playerId" = p."lordId"
          WHERE ps."snapshotId" = ${latestSnapshot.id}
          ORDER BY CAST(ps.${Prisma.raw(`"${sortBy}"`)} AS BIGINT) ${Prisma.raw(sortDirection)}
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        ` as any[];
        
        players = rawPlayers.map((row: any) => ({
          ...row,
          player: {
            currentName: row.currentName,
            currentAlliance: row.currentAlliance
          }
        }));
      }
    } else {
      // Use standard Prisma sorting for non-numeric fields
      const getOrderByClause = (): any => {
        const sortOrder = order as 'asc' | 'desc';
        
        switch (sortBy) {
          case 'name':
            return { name: sortOrder };
          case 'cityLevel':
            return { cityLevel: sortOrder };
          case 'victories':
            return { victories: sortOrder };
          case 'defeats':
            return { defeats: sortOrder };
          case 'citySieges':
            return { citySieges: sortOrder };
          case 'scouted':
            return { scouted: sortOrder };
          case 'helpsGiven':
            return { helpsGiven: sortOrder };
          case 'division':
            return { division: sortOrder };
          case 'killDeathRatio':
            return { unitsKilled: sortOrder };
          case 'winRate':
            return { victories: sortOrder };
          default:
            return { currentPower: 'desc' };
        }
      };
      
      players = await prisma.playerSnapshot.findMany({
        where: whereClause,
        include: {
          player: true
        },
        orderBy: getOrderByClause(),
        skip: (page - 1) * limit,
        take: limit
      });
    }

    // Get all unique alliances for filtering
    const alliances = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: latestSnapshot.id,
        allianceTag: {
          not: null
        }
      },
      select: {
        allianceTag: true
      },
      distinct: ['allianceTag'],
      orderBy: {
        allianceTag: 'asc'
      }
    });

    // Calculate additional metrics for display
    const playersWithMetrics = players.map((playerSnapshot: any, index: number) => {
      const unitsKilled = parseInt(playerSnapshot.unitsKilled || '0');
      const unitsDead = parseInt(playerSnapshot.unitsDead || '0');
      const victories = playerSnapshot.victories || 0;
      const defeats = playerSnapshot.defeats || 0;
      
      const killDeathRatio = unitsDead > 0 ? (unitsKilled / unitsDead).toFixed(2) : 'N/A';
      const winRate = (victories + defeats) > 0 ? 
        ((victories / (victories + defeats)) * 100).toFixed(1) : 'N/A';

      const totalCombats = victories + defeats;
      const totalPowerBreakdown = 
        parseInt(playerSnapshot.buildingPower || '0') +
        parseInt(playerSnapshot.heroPower || '0') +
        parseInt(playerSnapshot.legionPower || '0') +
        parseInt(playerSnapshot.techPower || '0');

      return {
        rank: (page - 1) * limit + index + 1,
        lordId: playerSnapshot.playerId,
        name: playerSnapshot.name,
        currentName: playerSnapshot.player.currentName,
        allianceTag: playerSnapshot.allianceTag,
        division: playerSnapshot.division,
        cityLevel: playerSnapshot.cityLevel,
        faction: playerSnapshot.faction,
        
        // Power metrics
        currentPower: parseInt(playerSnapshot.currentPower || '0'),
        power: parseInt(playerSnapshot.power || '0'),
        buildingPower: parseInt(playerSnapshot.buildingPower || '0'),
        heroPower: parseInt(playerSnapshot.heroPower || '0'),
        legionPower: parseInt(playerSnapshot.legionPower || '0'),
        techPower: parseInt(playerSnapshot.techPower || '0'),
        
        // Combat metrics
        unitsKilled,
        unitsDead,
        unitsHealed: parseInt(playerSnapshot.unitsHealed || '0'),
        merits: parseInt(playerSnapshot.merits || '0'),
        victories,
        defeats,
        citySieges: playerSnapshot.citySieges || 0,
        scouted: playerSnapshot.scouted || 0,
        
        // Calculated metrics
        killDeathRatio,
        winRate,
        totalCombats,
        
        // Activity metrics
        helpsGiven: playerSnapshot.helpsGiven || 0,
        
        // Resources
        gold: parseInt(playerSnapshot.gold || '0'),
        wood: parseInt(playerSnapshot.wood || '0'),
        ore: parseInt(playerSnapshot.ore || '0'),
        mana: parseInt(playerSnapshot.mana || '0'),
        gems: parseInt(playerSnapshot.gems || '0'),
        
        // Tier kills
        t1KillCount: parseInt(playerSnapshot.t1KillCount || '0'),
        t2KillCount: parseInt(playerSnapshot.t2KillCount || '0'),
        t3KillCount: parseInt(playerSnapshot.t3KillCount || '0'),
        t4KillCount: parseInt(playerSnapshot.t4KillCount || '0'),
        t5KillCount: parseInt(playerSnapshot.t5KillCount || '0'),
      };
    });

    const totalPages = Math.ceil(totalPlayers / limit);

    return NextResponse.json({
      players: playersWithMetrics,
      totalPlayers,
      currentPage: page,
      totalPages,
      limit,
      sortBy,
      order,
      alliance,
      alliances: alliances.map((a: any) => a.allianceTag).filter(Boolean),
      snapshotInfo: {
        id: latestSnapshot.id,
        timestamp: latestSnapshot.timestamp,
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}
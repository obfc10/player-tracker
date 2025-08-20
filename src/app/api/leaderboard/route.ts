import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getManagedAllianceTags } from '@/lib/alliance-config';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'currentPower';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const alliance = searchParams.get('alliance') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const seasonMode = searchParams.get('seasonMode') || 'current';
    const seasonId = searchParams.get('seasonId');

    // Determine which snapshots to query based on season selection
    let snapshotFilter: any = {};
    
    if (seasonMode === 'current' || seasonMode === 'specific') {
      // Get snapshots from specific season
      const targetSeasonId = seasonMode === 'specific' && seasonId 
        ? seasonId 
        : (await prisma.season.findFirst({ where: { isActive: true } }))?.id;
      
      if (targetSeasonId) {
        snapshotFilter.seasonId = targetSeasonId;
      }
    }
    // For 'all-time' mode, we don't add any season filter

    // Get the latest snapshot within the selected season/scope
    const latestSnapshot = await prisma.snapshot.findFirst({
      where: snapshotFilter,
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
      if (alliance === 'managed') {
        // Filter for managed alliances (PLAC, FLAs, Plaf)
        const managedTags = getManagedAllianceTags();
        whereClause.allianceTag = {
          in: managedTags
        };
      } else if (alliance === 'others') {
        // Filter for non-managed alliances
        const managedTags = getManagedAllianceTags();
        whereClause.allianceTag = {
          notIn: managedTags,
          not: null
        };
      } else {
        // Filter for specific alliance
        whereClause.allianceTag = alliance;
      }
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

    // Fetch ALL leaderboard data for proper sorting (we'll paginate after sorting)
    const allPlayers = await prisma.playerSnapshot.findMany({
      where: whereClause,
      include: {
        player: true
      }
    });

    // Sort the data based on the requested field
    const sortedPlayers = allPlayers.sort((a: any, b: any) => {
      let aValue, bValue;
      
      if (isNumericStringField(sortBy)) {
        // Parse numeric string fields
        aValue = parseInt(a[sortBy] || '0');
        bValue = parseInt(b[sortBy] || '0');
      } else {
        // Handle other field types
        switch (sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'cityLevel':
          case 'victories':
          case 'defeats':
          case 'citySieges':
          case 'scouted':
          case 'helpsGiven':
          case 'division':
            aValue = a[sortBy] || 0;
            bValue = b[sortBy] || 0;
            break;
          default:
            aValue = parseInt(a.currentPower || '0');
            bValue = parseInt(b.currentPower || '0');
        }
      }
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Apply pagination after sorting
    const players = sortedPlayers.slice((page - 1) * limit, page * limit);

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
        hasLeftRealm: playerSnapshot.player.hasLeftRealm,
        lastSeenAt: playerSnapshot.player.lastSeenAt,
        leftRealmAt: playerSnapshot.player.leftRealmAt,
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
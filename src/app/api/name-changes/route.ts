import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cacheService, CacheKeys, CacheTags } from '@/services/CacheService';
import { createOptimizedResponse, optimizeForLargeDataset, ResponseTimer } from '@/lib/response-optimization';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timer = new ResponseTimer();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const alliance = searchParams.get('alliance') || 'all';
    const timeRange = searchParams.get('timeRange') || '30'; // days
    const sortBy = searchParams.get('sortBy') || 'detectedAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const search = searchParams.get('search') || '';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Build where clause
    const whereClause: any = {
      detectedAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        { oldName: { contains: search, mode: 'insensitive' } },
        { newName: { contains: search, mode: 'insensitive' } },
        { player: { lordId: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Create cache key for this specific query
    const cacheKey = CacheKeys.NAME_CHANGES(timeRange, page, limit, alliance, search);
    
    // Get cached data or fetch from database
    const [totalChanges, changes] = await cacheService.cached(
      cacheKey,
      async () => {
        const [totalCount, changesData] = await Promise.all([
          prisma.nameChange.count({
            where: whereClause
          }),
          prisma.nameChange.findMany({
            where: whereClause,
            include: {
              player: {
                include: {
                  snapshots: {
                    include: {
                      snapshot: true
                    },
                    orderBy: {
                      snapshot: { timestamp: 'desc' }
                    },
                    take: 1
                  }
                }
              }
            },
            orderBy: {
              [sortBy]: order
            },
            skip: (page - 1) * limit,
            take: limit
          })
        ]);
        return [totalCount, changesData];
      },
      { ttl: 180000, tags: [CacheTags.NAME_CHANGES, CacheTags.PLAYERS] } // Cache for 3 minutes
    );

    // Apply alliance filter after fetching (since alliance is in snapshots)
    let filteredChanges = changes;
    if (alliance !== 'all') {
      filteredChanges = changes.filter((change: any) => {
        const latestSnapshot = change.player.snapshots[0];
        return latestSnapshot && latestSnapshot.allianceTag === alliance;
      });
    }

    // Get unique alliances for filtering
    const alliances = await prisma.playerSnapshot.findMany({
      where: {
        snapshot: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        allianceTag: { not: null }
      },
      select: {
        allianceTag: true
      },
      distinct: ['allianceTag'],
      orderBy: {
        allianceTag: 'asc'
      }
    });

    // Calculate summary statistics
    const summaryKey = `name-changes-summary:${timeRange}`;
    const summary = await cacheService.cached(
      summaryKey,
      async () => calculateNameChangeSummary(startDate, endDate),
      { ttl: 300000, tags: [CacheTags.NAME_CHANGES] } // Cache for 5 minutes
    );

    // Format changes data
    const formattedChanges = filteredChanges.map((change: any) => {
      const latestSnapshot = change.player.snapshots[0];
      
      return {
        id: change.id,
        playerId: change.playerId,
        playerCurrentName: change.player.currentName || change.newName, // Fallback to newName if currentName is wrong
        oldName: change.oldName,
        newName: change.newName,
        detectedAt: change.detectedAt,
        currentPower: latestSnapshot ? parseInt(latestSnapshot.currentPower) : 0,
        cityLevel: latestSnapshot ? latestSnapshot.cityLevel : 0,
        division: latestSnapshot ? latestSnapshot.division : 0,
        allianceTag: latestSnapshot ? latestSnapshot.allianceTag : null,
        nameLength: {
          old: change.oldName.length,
          new: change.newName.length
        },
        similarity: calculateNameSimilarity(change.oldName, change.newName)
      };
    });

    const totalPages = Math.ceil(totalChanges / limit);

    // Optimize response for large datasets
    const optimizedData = optimizeForLargeDataset(formattedChanges, page, limit, totalChanges);
    
    const responseData = {
      changes: optimizedData.data,
      summary,
      pagination: optimizedData.pagination,
      filters: {
        alliances: alliances.map((a: any) => a.allianceTag).filter(Boolean),
        timeRange: parseInt(timeRange),
        alliance,
        sortBy,
        order,
        search
      },
      performance: {
        ...optimizedData.performance,
        queryTime: timer.elapsed()
      }
    };

    const response = createOptimizedResponse(responseData, {
      enableCaching: true,
      cacheMaxAge: 180, // 3 minutes
      enableETag: true
    });
    
    return timer.addTimingHeader(response);

  } catch (error) {
    console.error('Error fetching name changes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch name changes data' },
      { status: 500 }
    );
  }
}

async function calculateNameChangeSummary(startDate: Date, endDate: Date) {
  const totalChanges = await prisma.nameChange.count({
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // Get most active players (by name changes)
  const mostActiveChangers = await prisma.nameChange.groupBy({
    by: ['playerId'],
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: {
      playerId: true
    },
    orderBy: {
      _count: {
        playerId: 'desc'
      }
    },
    take: 5
  });

  // Get player details for most active changers - FIXED N+1 QUERY ISSUE
  const playerIds = mostActiveChangers.map(changer => changer.playerId);
  const players = await prisma.player.findMany({
    where: { lordId: { in: playerIds } },
    include: {
      snapshots: {
        include: { snapshot: true },
        orderBy: { snapshot: { timestamp: 'desc' } },
        take: 1
      }
    }
  });
  
  // Create a map for efficient lookup
  const playerMap = new Map(players.map(player => [player.lordId, player]));
  
  // Build player details using the map
  const playerDetails = mostActiveChangers.map((changer: any) => {
    const player = playerMap.get(changer.playerId);
    
    return {
      playerId: changer.playerId,
      playerName: player?.currentName || 'Unknown',
      changeCount: changer._count.playerId,
      currentPower: player?.snapshots[0] ? parseInt(player.snapshots[0].currentPower) : 0,
      allianceTag: player?.snapshots[0]?.allianceTag || null
    };
  });

  // Analyze name change patterns
  const recentChanges = await prisma.nameChange.findMany({
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      oldName: true,
      newName: true
    }
  });

  const patterns = analyzeNamePatterns(recentChanges);

  return {
    totalChanges,
    averageChangesPerDay: Math.round(totalChanges / Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
    mostActiveChangers: playerDetails,
    patterns,
    timeRange: {
      start: startDate,
      end: endDate,
      days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    }
  };
}

function calculateNameSimilarity(oldName: string, newName: string): number {
  // Simple similarity calculation based on common characters
  const old = oldName.toLowerCase();
  const new_ = newName.toLowerCase();
  
  let commonChars = 0;
  const maxLength = Math.max(old.length, new_.length);
  
  for (let i = 0; i < Math.min(old.length, new_.length); i++) {
    if (old[i] === new_[i]) {
      commonChars++;
    }
  }
  
  return Math.round((commonChars / maxLength) * 100);
}

function analyzeNamePatterns(changes: Array<{ oldName: string; newName: string }>) {
  let addedNumbers = 0;
  let removedNumbers = 0;
  let addedSpecialChars = 0;
  let removedSpecialChars = 0;
  let lengthIncreases = 0;
  let lengthDecreases = 0;

  changes.forEach(change => {
    const oldHasNumbers = /\d/.test(change.oldName);
    const newHasNumbers = /\d/.test(change.newName);
    const oldHasSpecial = /[^a-zA-Z0-9]/.test(change.oldName);
    const newHasSpecial = /[^a-zA-Z0-9]/.test(change.newName);

    if (!oldHasNumbers && newHasNumbers) addedNumbers++;
    if (oldHasNumbers && !newHasNumbers) removedNumbers++;
    if (!oldHasSpecial && newHasSpecial) addedSpecialChars++;
    if (oldHasSpecial && !newHasSpecial) removedSpecialChars++;

    if (change.newName.length > change.oldName.length) lengthIncreases++;
    if (change.newName.length < change.oldName.length) lengthDecreases++;
  });

  return {
    addedNumbers,
    removedNumbers,
    addedSpecialChars,
    removedSpecialChars,
    lengthIncreases,
    lengthDecreases,
    totalAnalyzed: changes.length
  };
}
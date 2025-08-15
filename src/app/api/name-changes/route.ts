import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Get total count for pagination
    const totalChanges = await prisma.nameChange.count({
      where: whereClause
    });

    // Fetch name changes with player data
    const changes = await prisma.nameChange.findMany({
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
    });

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
    const summary = await calculateNameChangeSummary(startDate, endDate);

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

    return NextResponse.json({
      changes: formattedChanges,
      summary,
      pagination: {
        currentPage: page,
        totalPages,
        totalChanges,
        limit
      },
      filters: {
        alliances: alliances.map((a: any) => a.allianceTag).filter(Boolean),
        timeRange: parseInt(timeRange),
        alliance,
        sortBy,
        order,
        search
      }
    });

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

  // Get player details for most active changers
  const playerDetails = await Promise.all(
    mostActiveChangers.map(async (changer: any) => {
      const player = await prisma.player.findUnique({
        where: { lordId: changer.playerId },
        include: {
          snapshots: {
            include: { snapshot: true },
            orderBy: { snapshot: { timestamp: 'desc' } },
            take: 1
          }
        }
      });
      
      return {
        playerId: changer.playerId,
        playerName: player?.currentName || 'Unknown',
        changeCount: changer._count.playerId,
        currentPower: player?.snapshots[0] ? parseInt(player.snapshots[0].currentPower) : 0,
        allianceTag: player?.snapshots[0]?.allianceTag || null
      };
    })
  );

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
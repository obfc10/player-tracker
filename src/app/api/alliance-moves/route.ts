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

    // Add alliance filter
    if (alliance !== 'all') {
      whereClause.OR = [
        { oldAlliance: alliance },
        { newAlliance: alliance }
      ];
    }

    // Get total count for pagination
    const totalMoves = await prisma.allianceChange.count({
      where: whereClause
    });

    // Fetch alliance moves with player data
    const moves = await prisma.allianceChange.findMany({
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

    // Get unique alliances for filtering
    const alliances = await prisma.allianceChange.findMany({
      where: {
        detectedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        oldAlliance: true,
        newAlliance: true
      },
      distinct: ['oldAlliance', 'newAlliance']
    });

    const uniqueAlliances = new Set<string>();
    alliances.forEach(move => {
      if (move.oldAlliance) uniqueAlliances.add(move.oldAlliance);
      if (move.newAlliance) uniqueAlliances.add(move.newAlliance);
    });

    // Calculate summary statistics
    const summary = await calculateAllianceMoveSummary(startDate, endDate);

    // Format moves data
    const formattedMoves = moves.map((move: any) => {
      const latestSnapshot = move.player.snapshots[0];
      
      return {
        id: move.id,
        playerId: move.playerId,
        playerName: move.player.currentName,
        oldAlliance: move.oldAlliance,
        oldAllianceId: move.oldAllianceId,
        newAlliance: move.newAlliance,
        newAllianceId: move.newAllianceId,
        detectedAt: move.detectedAt,
        moveType: getMoveType(move.oldAlliance, move.newAlliance),
        currentPower: latestSnapshot ? parseInt(latestSnapshot.currentPower) : 0,
        cityLevel: latestSnapshot ? latestSnapshot.cityLevel : 0,
        division: latestSnapshot ? latestSnapshot.division : 0
      };
    });

    const totalPages = Math.ceil(totalMoves / limit);

    return NextResponse.json({
      moves: formattedMoves,
      summary,
      pagination: {
        currentPage: page,
        totalPages,
        totalMoves,
        limit
      },
      filters: {
        alliances: Array.from(uniqueAlliances).filter(Boolean).sort(),
        timeRange: parseInt(timeRange),
        alliance,
        sortBy,
        order
      }
    });

  } catch (error) {
    console.error('Error fetching alliance moves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alliance moves data' },
      { status: 500 }
    );
  }
}

function getMoveType(oldAlliance: string | null, newAlliance: string | null) {
  if (!oldAlliance && newAlliance) return 'joined';
  if (oldAlliance && !newAlliance) return 'left';
  if (oldAlliance && newAlliance) return 'transferred';
  return 'unknown';
}

async function calculateAllianceMoveSummary(startDate: Date, endDate: Date) {
  const totalMoves = await prisma.allianceChange.count({
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const joins = await prisma.allianceChange.count({
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      },
      oldAlliance: null,
      newAlliance: { not: null }
    }
  });

  const leaves = await prisma.allianceChange.count({
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      },
      oldAlliance: { not: null },
      newAlliance: null
    }
  });

  const transfers = await prisma.allianceChange.count({
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      },
      oldAlliance: { not: null },
      newAlliance: { not: null }
    }
  });

  // Get most active alliances (by moves in/out)
  const allianceActivity = await prisma.allianceChange.groupBy({
    by: ['newAlliance'],
    where: {
      detectedAt: {
        gte: startDate,
        lte: endDate
      },
      newAlliance: { not: null }
    },
    _count: {
      newAlliance: true
    },
    orderBy: {
      _count: {
        newAlliance: 'desc'
      }
    },
    take: 5
  });

  return {
    totalMoves,
    joins,
    leaves,
    transfers,
    netMovement: joins - leaves,
    mostActiveAlliances: allianceActivity.map((a: any) => ({
      alliance: a.newAlliance,
      joinCount: a._count.newAlliance
    })),
    timeRange: {
      start: startDate,
      end: endDate,
      days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    }
  };
}
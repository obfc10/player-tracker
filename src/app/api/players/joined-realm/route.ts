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
    const mode = searchParams.get('mode') || 'creation'; // 'creation' or 'snapshot'
    const fromSnapshotId = searchParams.get('fromSnapshot');
    const toSnapshotId = searchParams.get('toSnapshot');
    const daysAgo = parseInt(searchParams.get('daysAgo') || '30');

    if (mode === 'snapshot') {
      // Snapshot comparison mode
      if (!fromSnapshotId || !toSnapshotId) {
        return NextResponse.json(
          { error: 'Both fromSnapshot and toSnapshot are required for snapshot comparison mode' },
          { status: 400 }
        );
      }

      // Get the snapshots to verify they exist
      const [fromSnapshot, toSnapshot] = await Promise.all([
        prisma.snapshot.findUnique({ where: { id: fromSnapshotId } }),
        prisma.snapshot.findUnique({ where: { id: toSnapshotId } })
      ]);

      if (!fromSnapshot || !toSnapshot) {
        return NextResponse.json(
          { error: 'One or both snapshots not found' },
          { status: 404 }
        );
      }

      // Get players in the "to" snapshot
      const toPlayers = await prisma.playerSnapshot.findMany({
        where: { snapshotId: toSnapshotId },
        select: { playerId: true }
      });

      // Get players in the "from" snapshot
      const fromPlayers = await prisma.playerSnapshot.findMany({
        where: { snapshotId: fromSnapshotId },
        select: { playerId: true }
      });

      // Find players who are in toSnapshot but not in fromSnapshot (new joiners)
      const fromPlayerIds = new Set(fromPlayers.map(p => p.playerId));
      const newPlayerIds = toPlayers
        .filter(p => !fromPlayerIds.has(p.playerId))
        .map(p => p.playerId);

      const totalPlayers = newPlayerIds.length;

      // Get the actual player data for new joiners
      const joinedPlayers = await prisma.player.findMany({
        where: {
          lordId: { in: newPlayerIds.slice((page - 1) * limit, page * limit) },
          hasLeftRealm: false // Only active players
        },
        include: {
          snapshots: {
            where: { snapshotId: toSnapshotId },
            include: { snapshot: true }
          }
        }
      });

      const playersWithData = joinedPlayers.map((player, index) => {
        const snapshotData = player.snapshots[0];
        
        return {
          rank: (page - 1) * limit + index + 1,
          lordId: player.lordId,
          currentName: player.currentName,
          firstSeenInSnapshot: toSnapshot.timestamp,
          detectionMethod: 'snapshot_comparison',
          
          // Data from the snapshot when they first appeared
          snapshotData: snapshotData ? {
            allianceTag: snapshotData.allianceTag,
            cityLevel: snapshotData.cityLevel,
            currentPower: parseInt(snapshotData.currentPower || '0'),
            merits: parseInt(snapshotData.merits || '0'),
            victories: snapshotData.victories,
            defeats: snapshotData.defeats,
            division: snapshotData.division,
            snapshotDate: snapshotData.snapshot.timestamp
          } : null
        };
      });

      const totalPages = Math.ceil(totalPlayers / limit);

      return NextResponse.json({
        mode: 'snapshot',
        fromSnapshot: {
          id: fromSnapshot.id,
          timestamp: fromSnapshot.timestamp,
          filename: fromSnapshot.filename
        },
        toSnapshot: {
          id: toSnapshot.id,
          timestamp: toSnapshot.timestamp,
          filename: toSnapshot.filename
        },
        players: playersWithData,
        totalPlayers,
        currentPage: page,
        totalPages,
        limit,
        summary: {
          totalNewPlayers: totalPlayers,
          comparisonPeriod: {
            from: fromSnapshot.timestamp,
            to: toSnapshot.timestamp,
            daysBetween: Math.ceil((new Date(toSnapshot.timestamp).getTime() - new Date(fromSnapshot.timestamp).getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      });

    } else {
      // Original creation date mode
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      // Get total count of players who joined recently
      const totalPlayers = await prisma.player.count({
        where: {
          createdAt: {
            gte: cutoffDate
          },
          hasLeftRealm: false // Only active players
        }
      });

      // Get players who joined the realm recently
      const joinedPlayers = await prisma.player.findMany({
        where: {
          createdAt: {
            gte: cutoffDate
          },
          hasLeftRealm: false // Only active players
        },
        include: {
          snapshots: {
            orderBy: { snapshot: { timestamp: 'desc' } },
            take: 1,
            include: {
              snapshot: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const playersWithCurrentData = joinedPlayers.map((player, index) => {
        const latestSnapshot = player.snapshots[0];
        
        return {
          rank: (page - 1) * limit + index + 1,
          lordId: player.lordId,
          currentName: player.currentName,
          joinedAt: player.createdAt,
          lastSeenAt: player.lastSeenAt,
          daysSinceJoined: Math.floor((new Date().getTime() - new Date(player.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          detectionMethod: 'creation_date',
          
          // Current data from latest snapshot
          currentData: latestSnapshot ? {
            allianceTag: latestSnapshot.allianceTag,
            cityLevel: latestSnapshot.cityLevel,
            currentPower: parseInt(latestSnapshot.currentPower || '0'),
            merits: parseInt(latestSnapshot.merits || '0'),
            victories: latestSnapshot.victories,
            defeats: latestSnapshot.defeats,
            division: latestSnapshot.division,
            snapshotDate: latestSnapshot.snapshot.timestamp
          } : null
        };
      });

      const totalPages = Math.ceil(totalPlayers / limit);

      return NextResponse.json({
        mode: 'creation',
        players: playersWithCurrentData,
        totalPlayers,
        currentPage: page,
        totalPages,
        limit,
        daysAgo,
        summary: {
          totalJoined: totalPlayers,
          recentJoiners: playersWithCurrentData.filter(p => p.daysSinceJoined <= 7).length,
          weeklyJoiners: playersWithCurrentData.filter(p => p.daysSinceJoined <= 7 && p.daysSinceJoined >= 0).length
        }
      });
    }

  } catch (error) {
    console.error('Error fetching joined realm players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch joined realm players' },
      { status: 500 }
    );
  }
}
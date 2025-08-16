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
    const daysAgo = parseInt(searchParams.get('daysAgo') || '30');

    // Calculate date range for filtering
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    // Get total count
    const totalPlayers = await prisma.player.count({
      where: {
        hasLeftRealm: true,
        leftRealmAt: {
          gte: cutoffDate
        }
      }
    });

    // Get players who left the realm
    const leftPlayers = await prisma.player.findMany({
      where: {
        hasLeftRealm: true,
        leftRealmAt: {
          gte: cutoffDate
        }
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
      orderBy: { leftRealmAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const playersWithLastData = leftPlayers.map((player, index) => {
      const lastSnapshot = player.snapshots[0];
      
      return {
        rank: (page - 1) * limit + index + 1,
        lordId: player.lordId,
        currentName: player.currentName,
        hasLeftRealm: player.hasLeftRealm,
        lastSeenAt: player.lastSeenAt,
        leftRealmAt: player.leftRealmAt,
        daysGone: player.lastSeenAt ? 
          Math.floor((new Date().getTime() - new Date(player.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24)) : 
          null,
        daysSinceDetected: player.leftRealmAt ? 
          Math.floor((new Date().getTime() - new Date(player.leftRealmAt).getTime()) / (1000 * 60 * 60 * 24)) : 
          null,
        
        // Last known data
        lastKnownData: lastSnapshot ? {
          allianceTag: lastSnapshot.allianceTag,
          cityLevel: lastSnapshot.cityLevel,
          currentPower: parseInt(lastSnapshot.currentPower || '0'),
          merits: parseInt(lastSnapshot.merits || '0'),
          victories: lastSnapshot.victories,
          defeats: lastSnapshot.defeats,
          snapshotDate: lastSnapshot.snapshot.timestamp
        } : null
      };
    });

    const totalPages = Math.ceil(totalPlayers / limit);

    return NextResponse.json({
      players: playersWithLastData,
      totalPlayers,
      currentPage: page,
      totalPages,
      limit,
      daysAgo,
      summary: {
        totalLeft: totalPlayers,
        recentDepartures: playersWithLastData.filter(p => p.daysGone && p.daysGone <= 7).length,
        weeklyDepartures: playersWithLastData.filter(p => p.daysGone && p.daysGone <= 7 && p.daysGone > 0).length
      }
    });

  } catch (error) {
    console.error('Error fetching left realm players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch left realm players' },
      { status: 500 }
    );
  }
}
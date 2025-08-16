import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find players currently marked as "left realm" who had low power when last seen
    const POWER_FLOOR = 10000000; // 10 million power
    
    const playersMarkedAsLeft = await prisma.player.findMany({
      where: {
        hasLeftRealm: true
      },
      include: {
        snapshots: {
          orderBy: { snapshot: { timestamp: 'desc' } },
          take: 1,
          include: { snapshot: true }
        }
      }
    });

    // Filter to find players who were incorrectly marked (had < 10M power)
    const incorrectlyMarkedPlayers = playersMarkedAsLeft.filter(player => {
      const lastSnapshot = player.snapshots[0];
      if (!lastSnapshot) return false;
      
      const lastPower = parseInt(lastSnapshot.currentPower || '0');
      return lastPower < POWER_FLOOR; // These should NOT have been marked as left
    });

    console.log(`Found ${incorrectlyMarkedPlayers.length} players incorrectly marked as left (< 10M power)`);

    // Unmark these players as "left realm"
    if (incorrectlyMarkedPlayers.length > 0) {
      await prisma.player.updateMany({
        where: {
          lordId: { in: incorrectlyMarkedPlayers.map(p => p.lordId) }
        },
        data: {
          hasLeftRealm: false,
          leftRealmAt: null
        }
      });
    }

    // Also check for any players who should be marked as left but weren't due to old logic
    const currentTime = new Date();
    const cutoff7Days = new Date(currentTime.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const potentialLeftPlayers = await prisma.player.findMany({
      where: {
        hasLeftRealm: false,
        lastSeenAt: { lt: cutoff7Days }
      },
      include: {
        snapshots: {
          orderBy: { snapshot: { timestamp: 'desc' } },
          take: 1
        }
      }
    });

    const shouldBeMarkedAsLeft = potentialLeftPlayers.filter(player => {
      const lastSnapshot = player.snapshots[0];
      if (!lastSnapshot) return false;
      
      const lastPower = parseInt(lastSnapshot.currentPower || '0');
      return lastPower >= POWER_FLOOR; // These SHOULD be marked as left
    });

    if (shouldBeMarkedAsLeft.length > 0) {
      await prisma.player.updateMany({
        where: {
          lordId: { in: shouldBeMarkedAsLeft.map(p => p.lordId) }
        },
        data: {
          hasLeftRealm: true,
          leftRealmAt: currentTime
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Left realm status corrected based on 10M power floor',
      results: {
        incorrectlyMarkedCount: incorrectlyMarkedPlayers.length,
        correctedToActive: incorrectlyMarkedPlayers.map(p => ({
          lordId: p.lordId,
          name: p.currentName,
          lastPower: p.snapshots[0] ? parseInt(p.snapshots[0].currentPower || '0') : 0
        })),
        shouldHaveBeenMarked: shouldBeMarkedAsLeft.length,
        newlyMarkedAsLeft: shouldBeMarkedAsLeft.map(p => ({
          lordId: p.lordId,
          name: p.currentName,
          lastPower: p.snapshots[0] ? parseInt(p.snapshots[0].currentPower || '0') : 0
        }))
      }
    });

  } catch (error) {
    console.error('Error fixing left realm status:', error);
    return NextResponse.json({ 
      error: 'Failed to fix left realm status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
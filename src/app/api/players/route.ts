import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeLeftRealm = searchParams.get('includeLeftRealm') === 'true';
  try {
    // Get the latest snapshot to work with current data
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json({ players: [] });
    }

    // Get all player snapshots from the latest snapshot
    const playerSnapshots = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: latestSnapshot.id
      },
      include: {
        player: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform to match PlayerSelectionGrid interface
    const transformedPlayers = playerSnapshots
      .filter((snapshot: any) => {
        // Filter out left realm players unless explicitly requested
        if (!includeLeftRealm && snapshot.player.hasLeftRealm) {
          return false;
        }
        return true;
      })
      .map((snapshot: any) => ({
        lordId: snapshot.playerId,
        currentName: snapshot.name,
        allianceTag: snapshot.allianceTag || undefined,
        division: snapshot.division,
        cityLevel: snapshot.cityLevel,
        currentPower: parseInt(snapshot.currentPower) || 0,
        hasLeftRealm: snapshot.player.hasLeftRealm || false
      }));

    return NextResponse.json({ players: transformedPlayers });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}
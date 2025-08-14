import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // Search players by name or lord ID
    const players = await prisma.player.findMany({
      where: {
        OR: [
          {
            currentName: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            lordId: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
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
      },
      take: limit,
      orderBy: {
        currentName: 'asc'
      }
    });

    const searchResults = players.map((player: any) => {
      const latestSnapshot = player.snapshots[0];
      return {
        lordId: player.lordId,
        currentName: player.currentName,
        currentPower: latestSnapshot ? parseInt(latestSnapshot.currentPower) : 0,
        allianceTag: latestSnapshot?.allianceTag || null,
        lastSeen: latestSnapshot?.snapshot.timestamp || null
      };
    });

    return NextResponse.json(searchResults);

  } catch (error) {
    console.error('Error searching players:', error);
    return NextResponse.json(
      { error: 'Failed to search players' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get recent snapshots for dropdown selection
    const snapshots = await prisma.snapshot.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        timestamp: true,
        filename: true,
        kingdom: true,
        _count: {
          select: {
            players: true
          }
        }
      }
    });

    const snapshotsWithPlayerCount = snapshots.map(snapshot => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      filename: snapshot.filename,
      kingdom: snapshot.kingdom,
      playerCount: snapshot._count.players,
      displayName: `${snapshot.filename} (${snapshot._count.players} players)`
    }));

    return NextResponse.json({
      snapshots: snapshotsWithPlayerCount,
      total: snapshots.length
    });

  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      include: {
        snapshots: {
          orderBy: { 
            snapshot: { timestamp: 'desc' }
          },
          take: 1
        }
      }
    });

    return NextResponse.json(players);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}
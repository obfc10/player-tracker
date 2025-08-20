import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PUT /api/row/game-events/[eventId]/scores/[scoreId] - Update player score
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; scoreId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId, scoreId } = await params;
    const { 
      garrisonPoints, 
      seedPoints, 
      killPoints, 
      totalPoints,
      performanceRating,
      mvpVotes, 
      notes 
    } = await request.json();

    // Verify the score belongs to the specified event
    const existingScore = await prisma.playerEventRole.findUnique({
      where: { id: scoreId },
      include: {
        gameEvent: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!existingScore) {
      return NextResponse.json({ error: 'Player score not found' }, { status: 404 });
    }

    if (existingScore.gameEventId !== eventId) {
      return NextResponse.json({ error: 'Score does not belong to this event' }, { status: 400 });
    }

    // Only allow score updates for events in SCORING status
    if (existingScore.gameEvent.status !== 'SCORING') {
      return NextResponse.json({ 
        error: 'Scores can only be updated for events in SCORING status' 
      }, { status: 400 });
    }

    // Calculate total points if individual scores are provided
    let calculatedTotal = totalPoints;
    if (garrisonPoints !== undefined && seedPoints !== undefined && killPoints !== undefined) {
      calculatedTotal = garrisonPoints + seedPoints + killPoints;
    }

    const updateData: any = {};
    if (garrisonPoints !== undefined) updateData.garrisonPoints = Math.max(0, Math.floor(garrisonPoints));
    if (seedPoints !== undefined) updateData.seedPoints = Math.max(0, Math.floor(seedPoints));
    if (killPoints !== undefined) updateData.killPoints = Math.max(0, Math.floor(killPoints));
    if (calculatedTotal !== undefined) updateData.totalPoints = Math.max(0, Math.floor(calculatedTotal));
    if (performanceRating !== undefined) updateData.performanceRating = performanceRating;
    if (mvpVotes !== undefined) updateData.mvpVotes = Math.max(0, Math.floor(mvpVotes));
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const updatedScore = await prisma.playerEventRole.update({
      where: { id: scoreId },
      data: updateData,
      include: {
        player: {
          select: {
            lordId: true,
            currentName: true
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      playerScore: updatedScore 
    });

  } catch (error) {
    console.error('Error updating player score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
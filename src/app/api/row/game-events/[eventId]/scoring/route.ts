import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/game-events/[eventId]/scoring - Get all player scores for event
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { eventId } = params;

    const playerRoles = await prisma.playerEventRole.findMany({
      where: { gameEventId: eventId },
      include: {
        player: {
          select: {
            lordId: true,
            currentName: true
          }
        },
        role: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: [
        { totalPoints: 'desc' },
        { killPoints: 'desc' }
      ]
    });

    return NextResponse.json({ playerRoles });
  } catch (error) {
    console.error('Error fetching player scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/row/game-events/[eventId]/scoring - Add/update player scores
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId } = params;
    const { playerScores } = await request.json();

    if (!playerScores || !Array.isArray(playerScores)) {
      return NextResponse.json({ error: 'Player scores array is required' }, { status: 400 });
    }

    // Validate event exists and is in scoring phase
    const gameEvent = await prisma.gameEvent.findUnique({
      where: { id: eventId }
    });

    if (!gameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 });
    }

    if (gameEvent.status === 'FINALIZED') {
      return NextResponse.json({ 
        error: 'Cannot update scores for finalized events' 
      }, { status: 400 });
    }

    // Process each player score
    const results = [];
    for (const score of playerScores) {
      const { 
        playerId, 
        roleId, 
        garrisonPoints = 0, 
        seedPoints = 0, 
        killPoints = 0,
        performanceRating,
        mvpVotes = 0,
        notes 
      } = score;

      if (!playerId || !roleId) {
        continue; // Skip invalid entries
      }

      // Calculate total points
      const totalPoints = garrisonPoints + seedPoints + killPoints;

      // Upsert player event role
      const playerRole = await prisma.playerEventRole.upsert({
        where: {
          gameEventId_playerId_roleId: {
            gameEventId: eventId,
            playerId,
            roleId
          }
        },
        update: {
          garrisonPoints,
          seedPoints,
          killPoints,
          totalPoints,
          performanceRating: performanceRating || null,
          mvpVotes,
          notes: notes || null
        },
        create: {
          gameEventId: eventId,
          playerId,
          roleId,
          garrisonPoints,
          seedPoints,
          killPoints,
          totalPoints,
          performanceRating: performanceRating || null,
          mvpVotes,
          notes: notes || null
        },
        include: {
          player: {
            select: {
              lordId: true,
              currentName: true
            }
          },
          role: {
            select: {
              name: true
            }
          }
        }
      });

      results.push(playerRole);
    }

    return NextResponse.json({ 
      message: `Updated scores for ${results.length} player roles`,
      playerRoles: results 
    });
  } catch (error) {
    console.error('Error updating player scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/row/game-events/[eventId]/scoring - Finalize event scoring
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId } = params;
    const { outcome } = await request.json();

    // Validate event exists
    const gameEvent = await prisma.gameEvent.findUnique({
      where: { id: eventId },
      include: {
        playerRoles: true,
        teams: true
      }
    });

    if (!gameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 });
    }

    if (gameEvent.status === 'FINALIZED') {
      return NextResponse.json({ 
        error: 'Event is already finalized' 
      }, { status: 400 });
    }

    // Update event status to finalized
    const updatedEvent = await prisma.gameEvent.update({
      where: { id: eventId },
      data: {
        status: 'FINALIZED',
        outcome: outcome || null
      },
      include: {
        teams: {
          select: {
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            playerRoles: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Event scoring finalized successfully',
      gameEvent: updatedEvent
    });
  } catch (error) {
    console.error('Error finalizing event scoring:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
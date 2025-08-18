import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/events/[eventId]/teams/[teamId]/players - Add players to team
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId, teamId } = params;
    const { playerIds } = await request.json();

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'Player IDs are required' }, { status: 400 });
    }

    // Verify team exists and belongs to the event
    const team = await prisma.eventTeam.findFirst({
      where: {
        id: teamId,
        eventId
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify all players exist
    const players = await prisma.player.findMany({
      where: {
        lordId: {
          in: playerIds
        }
      }
    });

    if (players.length !== playerIds.length) {
      return NextResponse.json({ error: 'One or more players not found' }, { status: 404 });
    }

    // Check for existing participations
    const existingParticipations = await prisma.eventParticipation.findMany({
      where: {
        teamId,
        playerId: {
          in: playerIds
        },
        leftAt: null
      }
    });

    if (existingParticipations.length > 0) {
      const existingPlayerIds = existingParticipations.map(p => p.playerId);
      return NextResponse.json({ 
        error: `Players already in team: ${existingPlayerIds.join(', ')}` 
      }, { status: 400 });
    }

    // Create participations
    const participations = await prisma.eventParticipation.createMany({
      data: playerIds.map((playerId: string) => ({
        eventId,
        teamId,
        playerId,
        joinedAt: new Date(),
        addedById: session.user.id
      }))
    });

    return NextResponse.json({ 
      message: `Added ${participations.count} players to team`,
      addedCount: participations.count
    });
  } catch (error) {
    console.error('Error adding players to team:', error);
    return NextResponse.json(
      { error: 'Failed to add players to team' },
      { status: 500 }
    );
  }
}
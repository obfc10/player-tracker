import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/events/[eventId]/teams/[teamId]/players/[playerId] - Remove player from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; teamId: string; playerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId, teamId, playerId } = await params;

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

    // Find the active participation
    const participation = await prisma.eventParticipation.findFirst({
      where: {
        teamId,
        playerId,
        leftAt: null
      },
      include: {
        player: {
          select: {
            lordId: true,
            currentName: true
          }
        }
      }
    });

    if (!participation) {
      return NextResponse.json({ error: 'Player not found in team' }, { status: 404 });
    }

    // Mark participation as ended
    await prisma.eventParticipation.update({
      where: {
        id: participation.id
      },
      data: {
        leftAt: new Date()
      }
    });

    return NextResponse.json({ 
      message: 'Player removed from team successfully',
      removedPlayer: {
        lordId: participation.player.lordId,
        name: participation.player.currentName
      }
    });
  } catch (error) {
    console.error('Error removing player from team:', error);
    return NextResponse.json(
      { error: 'Failed to remove player from team' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { eventId } = await params;

    const participations = await prisma.eventParticipation.findMany({
      where: {
        eventId,
        leftAt: null // Only active participants
      },
      include: {
        player: {
          select: {
            lordId: true,
            currentName: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        addedBy: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: [
        { joinedAt: 'desc' }
      ]
    });

    return NextResponse.json({ participations });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId } = await params;
    const { playerIds, notes, teamId } = await request.json();

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'At least one player ID is required' }, { status: 400 });
    }

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Validate all players exist
    const players = await prisma.player.findMany({
      where: {
        lordId: {
          in: playerIds
        }
      }
    });

    if (players.length !== playerIds.length) {
      const foundPlayerIds = players.map(p => p.lordId);
      const missingPlayerIds = playerIds.filter(id => !foundPlayerIds.includes(id));
      return NextResponse.json({ 
        error: `Players not found: ${missingPlayerIds.join(', ')}` 
      }, { status: 400 });
    }

    // Check for existing participations and filter out duplicates
    const existingParticipations = await prisma.eventParticipation.findMany({
      where: {
        eventId,
        playerId: {
          in: playerIds
        },
        leftAt: null
      }
    });

    const existingPlayerIds = existingParticipations.map(p => p.playerId);
    const newPlayerIds = playerIds.filter(id => !existingPlayerIds.includes(id));

    if (newPlayerIds.length === 0) {
      return NextResponse.json({ 
        error: 'All selected players are already participating in this event' 
      }, { status: 400 });
    }

    // Validate team exists if teamId provided
    if (teamId) {
      const team = await prisma.eventTeam.findUnique({
        where: { id: teamId }
      });
      
      if (!team || team.eventId !== eventId) {
        return NextResponse.json({ error: 'Invalid team for this event' }, { status: 400 });
      }
    }

    // Create new participations
    const participations = await prisma.eventParticipation.createMany({
      data: newPlayerIds.map(playerId => ({
        eventId,
        playerId,
        teamId: teamId || null,
        notes: notes || null,
        addedById: session.user.id
      }))
    });

    // Fetch the created participations with full data
    const createdParticipations = await prisma.eventParticipation.findMany({
      where: {
        eventId,
        playerId: {
          in: newPlayerIds
        },
        leftAt: null
      },
      include: {
        player: {
          select: {
            lordId: true,
            currentName: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        addedBy: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({ 
      participations: createdParticipations,
      message: `Added ${newPlayerIds.length} player(s) to the event${existingPlayerIds.length > 0 ? `. ${existingPlayerIds.length} player(s) were already participating.` : '.'}`
    });
  } catch (error) {
    console.error('Error adding event participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId } = await params;
    const { playerIds } = await request.json();

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'At least one player ID is required' }, { status: 400 });
    }

    // Update participations to mark as left
    const updated = await prisma.eventParticipation.updateMany({
      where: {
        eventId,
        playerId: {
          in: playerIds
        },
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    });

    return NextResponse.json({ 
      message: `Removed ${updated.count} player(s) from the event`
    });
  } catch (error) {
    console.error('Error removing event participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
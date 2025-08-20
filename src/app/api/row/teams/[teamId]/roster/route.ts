import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/teams/[teamId]/roster - Get team roster
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { teamId } = await params;

    const team = await prisma.persistentTeam.findUnique({
      where: { id: teamId },
      include: {
        roster: {
          where: { isActive: true },
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true,
                hasLeftRealm: true,
                lastSeenAt: true
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { dateJoined: 'asc' }
          ]
        }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Separate starters and substitutes
    const starters = team.roster.filter(r => r.position === 'STARTER');
    const substitutes = team.roster.filter(r => r.position === 'SUBSTITUTE');

    return NextResponse.json({
      team: {
        ...team,
        starters,
        substitutes,
        starterCount: starters.length,
        substituteCount: substitutes.length
      }
    });
  } catch (error) {
    console.error('Error fetching team roster:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/row/teams/[teamId]/roster - Add players to team roster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { teamId } = await params;
    const { playerIds, position = 'STARTER' } = await request.json();

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'Player IDs are required' }, { status: 400 });
    }

    // Validate team exists
    const team = await prisma.persistentTeam.findUnique({
      where: { id: teamId },
      include: {
        roster: {
          where: { isActive: true }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check roster limits
    const currentStarters = team.roster.filter(r => r.position === 'STARTER').length;
    const currentSubs = team.roster.filter(r => r.position === 'SUBSTITUTE').length;
    
    if (position === 'STARTER' && currentStarters + playerIds.length > 30) {
      return NextResponse.json({ 
        error: `Cannot exceed 30 starters. Current: ${currentStarters}, Adding: ${playerIds.length}` 
      }, { status: 400 });
    }
    
    if (position === 'SUBSTITUTE' && currentSubs + playerIds.length > 15) {
      return NextResponse.json({ 
        error: `Cannot exceed 15 substitutes. Current: ${currentSubs}, Adding: ${playerIds.length}` 
      }, { status: 400 });
    }

    // Verify all players exist
    const players = await prisma.player.findMany({
      where: {
        lordId: { in: playerIds }
      }
    });

    if (players.length !== playerIds.length) {
      return NextResponse.json({ error: 'One or more players not found' }, { status: 404 });
    }

    // Check for existing roster entries
    const existingRoster = await prisma.teamRoster.findMany({
      where: {
        teamId,
        playerId: { in: playerIds },
        isActive: true
      }
    });

    if (existingRoster.length > 0) {
      const existingPlayerIds = existingRoster.map(r => r.playerId);
      return NextResponse.json({ 
        error: `Players already on team: ${existingPlayerIds.join(', ')}` 
      }, { status: 400 });
    }

    // Add players to roster
    const rosterEntries = await prisma.teamRoster.createMany({
      data: playerIds.map((playerId: string) => ({
        teamId,
        playerId,
        position: position as 'STARTER' | 'SUBSTITUTE'
      }))
    });

    return NextResponse.json({ 
      message: `Added ${rosterEntries.count} players to team`,
      addedCount: rosterEntries.count
    });
  } catch (error) {
    console.error('Error adding players to roster:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/row/teams/[teamId]/roster - Bulk update roster positions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { teamId } = await params;
    const { updates } = await request.json(); // Array of { playerId, position }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
    }

    // Validate team exists
    const team = await prisma.persistentTeam.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Validate roster limits after updates
    const starterCount = updates.filter(u => u.position === 'STARTER').length;
    const subCount = updates.filter(u => u.position === 'SUBSTITUTE').length;

    if (starterCount > 30) {
      return NextResponse.json({ error: 'Cannot have more than 30 starters' }, { status: 400 });
    }

    if (subCount > 15) {
      return NextResponse.json({ error: 'Cannot have more than 15 substitutes' }, { status: 400 });
    }

    // Perform bulk updates
    const updatePromises = updates.map((update: any) =>
      prisma.teamRoster.updateMany({
        where: {
          teamId,
          playerId: update.playerId,
          isActive: true
        },
        data: {
          position: update.position
        }
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: 'Roster updated successfully' });
  } catch (error) {
    console.error('Error updating roster:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
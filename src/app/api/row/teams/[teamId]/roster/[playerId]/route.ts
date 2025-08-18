import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/row/teams/[teamId]/roster/[playerId] - Remove player from roster
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string; playerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { teamId, playerId } = params;

    // Find the active roster entry
    const rosterEntry = await prisma.teamRoster.findFirst({
      where: {
        teamId,
        playerId,
        isActive: true
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
            name: true
          }
        }
      }
    });

    if (!rosterEntry) {
      return NextResponse.json({ error: 'Player not found on team roster' }, { status: 404 });
    }

    // Instead of deleting, mark as inactive to preserve history
    await prisma.teamRoster.update({
      where: { id: rosterEntry.id },
      data: {
        isActive: false,
        dateLeft: new Date()
      }
    });

    return NextResponse.json({ 
      message: 'Player removed from team successfully',
      removedPlayer: {
        lordId: rosterEntry.player.lordId,
        name: rosterEntry.player.currentName,
        team: rosterEntry.team.name,
        position: rosterEntry.position
      }
    });
  } catch (error) {
    console.error('Error removing player from roster:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/row/teams/[teamId]/roster/[playerId] - Update player position
export async function PUT(
  request: NextRequest,
  { params }: { params: { teamId: string; playerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { teamId, playerId } = params;
    const { position, notes } = await request.json();

    if (!position || !['STARTER', 'SUBSTITUTE'].includes(position)) {
      return NextResponse.json({ error: 'Valid position (STARTER or SUBSTITUTE) is required' }, { status: 400 });
    }

    // Find the active roster entry
    const rosterEntry = await prisma.teamRoster.findFirst({
      where: {
        teamId,
        playerId,
        isActive: true
      }
    });

    if (!rosterEntry) {
      return NextResponse.json({ error: 'Player not found on team roster' }, { status: 404 });
    }

    // Check roster limits if changing position
    if (rosterEntry.position !== position) {
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

      const currentStarters = team.roster.filter(r => r.position === 'STARTER').length;
      const currentSubs = team.roster.filter(r => r.position === 'SUBSTITUTE').length;

      if (position === 'STARTER' && rosterEntry.position === 'SUBSTITUTE') {
        if (currentStarters >= 30) {
          return NextResponse.json({ error: 'Cannot exceed 30 starters' }, { status: 400 });
        }
      }

      if (position === 'SUBSTITUTE' && rosterEntry.position === 'STARTER') {
        if (currentSubs >= 15) {
          return NextResponse.json({ error: 'Cannot exceed 15 substitutes' }, { status: 400 });
        }
      }
    }

    // Update the roster entry
    const updatedEntry = await prisma.teamRoster.update({
      where: { id: rosterEntry.id },
      data: {
        position: position as 'STARTER' | 'SUBSTITUTE',
        notes: notes || rosterEntry.notes
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

    return NextResponse.json({ 
      message: 'Player position updated successfully',
      rosterEntry: updatedEntry
    });
  } catch (error) {
    console.error('Error updating player position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
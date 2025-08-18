import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/teams/[teamId] - Get a specific persistent team
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const team = await prisma.persistentTeam.findUnique({
      where: { 
        id: params.teamId,
        isActive: true 
      },
      include: {
        roster: {
          where: { isActive: true },
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true,
                hasLeftRealm: true
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { dateJoined: 'asc' }
          ]
        },
        _count: {
          select: {
            roster: {
              where: { isActive: true }
            },
            gameEvents: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Transform data for better frontend consumption
    const transformedTeam = {
      ...team,
      starters: team.roster.filter(r => r.position === 'STARTER'),
      substitutes: team.roster.filter(r => r.position === 'SUBSTITUTE'),
      totalPlayers: team._count.roster,
      totalEvents: team._count.gameEvents
    };

    return NextResponse.json({ team: transformedTeam });
  } catch (error) {
    console.error('Error fetching persistent team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/row/teams/[teamId] - Update a persistent team
export async function PUT(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { name, description, color } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Check if team exists
    const existingTeam = await prisma.persistentTeam.findUnique({
      where: { id: params.teamId }
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if another team with the same name exists (excluding current team)
    const duplicateTeam = await prisma.persistentTeam.findFirst({
      where: { 
        name: name.trim(),
        id: { not: params.teamId },
        isActive: true
      }
    });

    if (duplicateTeam) {
      return NextResponse.json({ error: 'Team name already exists' }, { status: 400 });
    }

    const updatedTeam = await prisma.persistentTeam.update({
      where: { id: params.teamId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        updatedAt: new Date()
      },
      include: {
        roster: {
          where: { isActive: true },
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true,
                hasLeftRealm: true
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { dateJoined: 'asc' }
          ]
        },
        _count: {
          select: {
            roster: {
              where: { isActive: true }
            },
            gameEvents: true
          }
        }
      }
    });

    // Transform data for better frontend consumption
    const transformedTeam = {
      ...updatedTeam,
      starters: updatedTeam.roster.filter(r => r.position === 'STARTER'),
      substitutes: updatedTeam.roster.filter(r => r.position === 'SUBSTITUTE'),
      totalPlayers: updatedTeam._count.roster,
      totalEvents: updatedTeam._count.gameEvents
    };

    return NextResponse.json({ team: transformedTeam });
  } catch (error) {
    console.error('Error updating persistent team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/row/teams/[teamId] - Delete (soft delete) a persistent team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    // Check if team exists
    const existingTeam = await prisma.persistentTeam.findUnique({
      where: { id: params.teamId },
      include: {
        _count: {
          select: {
            gameEvents: true
          }
        }
      }
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if team has associated game events
    if (existingTeam._count.gameEvents > 0) {
      // Soft delete - mark as inactive instead of hard delete to preserve event history
      await prisma.persistentTeam.update({
        where: { id: params.teamId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Also soft delete all roster entries
      await prisma.persistentTeamRoster.updateMany({
        where: { persistentTeamId: params.teamId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    } else {
      // Hard delete if no events are associated
      await prisma.persistentTeamRoster.deleteMany({
        where: { persistentTeamId: params.teamId }
      });

      await prisma.persistentTeam.delete({
        where: { id: params.teamId }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persistent team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
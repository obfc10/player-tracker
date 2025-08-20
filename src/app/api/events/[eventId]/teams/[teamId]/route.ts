import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PUT /api/events/[eventId]/teams/[teamId] - Update a team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId, teamId } = await params;
    const { name, color, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Verify team exists and belongs to the event
    const existingTeam = await prisma.eventTeam.findFirst({
      where: {
        id: teamId,
        eventId
      }
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if new name conflicts with another team (if name is being changed)
    if (name.trim() !== existingTeam.name) {
      const nameConflict = await prisma.eventTeam.findFirst({
        where: {
          eventId,
          name: name.trim(),
          id: { not: teamId }
        }
      });

      if (nameConflict) {
        return NextResponse.json({ error: 'Team name already exists for this event' }, { status: 400 });
      }
    }

    // Update team
    const updatedTeam = await prisma.eventTeam.update({
      where: { id: teamId },
      data: {
        name: name.trim(),
        color: color || null,
        description: description?.trim() || null
      },
      include: {
        participations: {
          where: {
            leftAt: null
          },
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true
              }
            }
          },
          orderBy: {
            joinedAt: 'asc'
          }
        },
        _count: {
          select: {
            participations: {
              where: {
                leftAt: null
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/teams/[teamId] - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId, teamId } = await params;

    // Verify team exists and belongs to the event
    const existingTeam = await prisma.eventTeam.findFirst({
      where: {
        id: teamId,
        eventId
      },
      include: {
        _count: {
          select: {
            participations: {
              where: {
                leftAt: null
              }
            }
          }
        }
      }
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Delete team (CASCADE will handle participations)
    await prisma.eventTeam.delete({
      where: { id: teamId }
    });

    return NextResponse.json({ 
      message: 'Team deleted successfully',
      deletedTeam: {
        id: teamId,
        name: existingTeam.name,
        memberCount: existingTeam._count.participations
      }
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/game-events/[eventId] - Get specific game event
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

    const gameEvent = await prisma.gameEvent.findUnique({
      where: { id: eventId },
      include: {
        teams: {
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
              }
            }
          }
        },
        playerRoles: {
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
        },
        createdBy: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    if (!gameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 });
    }

    return NextResponse.json({ gameEvent });
  } catch (error) {
    console.error('Error fetching game event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/row/game-events/[eventId] - Update game event
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
    const { 
      name, 
      description, 
      eventDate, 
      status, 
      outcome, 
      notes,
      teamIds 
    } = await request.json();

    // Check if event exists
    const existingEvent = await prisma.gameEvent.findUnique({
      where: { id: eventId },
      include: {
        teams: true
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 });
    }

    // Validate status progression (can't go backwards in certain cases)
    if (status && existingEvent.status === 'FINALIZED' && status !== 'FINALIZED') {
      return NextResponse.json({ 
        error: 'Cannot change status of finalized event' 
      }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (status !== undefined) updateData.status = status;
    if (outcome !== undefined) updateData.outcome = outcome;
    if (notes !== undefined) updateData.notes = notes;

    // Handle team updates
    if (teamIds !== undefined) {
      // Validate teams exist
      if (teamIds.length > 0) {
        const teams = await prisma.persistentTeam.findMany({
          where: {
            id: { in: teamIds },
            isActive: true
          }
        });

        if (teams.length !== teamIds.length) {
          return NextResponse.json({ error: 'One or more teams not found' }, { status: 404 });
        }
      }

      // Update team associations
      updateData.teams = {
        set: teamIds.map((id: string) => ({ id }))
      };
    }

    const updatedEvent = await prisma.gameEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        teams: {
          select: {
            id: true,
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

    return NextResponse.json({ gameEvent: updatedEvent });
  } catch (error) {
    console.error('Error updating game event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/row/game-events/[eventId] - Delete game event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId } = params;

    // Check if event exists
    const existingEvent = await prisma.gameEvent.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            playerRoles: true
          }
        }
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 });
    }

    // Prevent deletion if event is finalized
    if (existingEvent.status === 'FINALIZED') {
      return NextResponse.json({ 
        error: 'Cannot delete finalized events' 
      }, { status: 400 });
    }

    // Delete the event (CASCADE will handle related records)
    await prisma.gameEvent.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ 
      message: 'Game event deleted successfully',
      deletedEvent: {
        id: eventId,
        name: existingEvent.name,
        playerRoleCount: existingEvent._count.playerRoles
      }
    });
  } catch (error) {
    console.error('Error deleting game event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
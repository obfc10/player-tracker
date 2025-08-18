import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PUT /api/row/roles/[roleId] - Update an event role
export async function PUT(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { roleId } = params;
    const { name, description, color, sortOrder, isActive } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Check if role exists
    const existingRole = await prisma.eventRole.findUnique({
      where: { id: roleId }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if new name conflicts with another role
    if (name.trim() !== existingRole.name) {
      const nameConflict = await prisma.eventRole.findUnique({
        where: { name: name.trim() }
      });

      if (nameConflict) {
        return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
      }
    }

    const updatedRole = await prisma.eventRole.update({
      where: { id: roleId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({ role: updatedRole });
  } catch (error) {
    console.error('Error updating event role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/row/roles/[roleId] - Deactivate an event role
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { roleId } = params;

    // Check if role exists
    const existingRole = await prisma.eventRole.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            playerRoles: true
          }
        }
      }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Instead of deleting, deactivate the role to preserve historical data
    const updatedRole = await prisma.eventRole.update({
      where: { id: roleId },
      data: { isActive: false }
    });

    return NextResponse.json({ 
      message: 'Role deactivated successfully',
      role: updatedRole,
      affectedPlayerRoles: existingRole._count.playerRoles
    });
  } catch (error) {
    console.error('Error deactivating event role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/roles - Get all event roles
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const roles = await prisma.eventRole.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            playerRoles: true
          }
        }
      }
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching event roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/row/roles - Create a new event role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { name, description, color, sortOrder } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Check if role name already exists
    const existingRole = await prisma.eventRole.findUnique({
      where: { name: name.trim() }
    });

    if (existingRole) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    const role = await prisma.eventRole.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        sortOrder: sortOrder || 0
      }
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error creating event role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
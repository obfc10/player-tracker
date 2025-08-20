import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await params;

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

// PATCH user (for status updates and user details)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await params;
    const { status, role, username, name, resetPassword } = await request.json();

    // Validate status if provided
    if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate role if provided
    if (role && !['ADMIN', 'VIEWER', 'EVENT_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate username if provided
    if (username && username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    // Prevent changing own status to non-approved
    if (userId === session.user.id && status && status !== 'APPROVED') {
      return NextResponse.json({ error: 'Cannot change your own approval status' }, { status: 400 });
    }

    // Check if username is already taken (if changing username)
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });
      
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }
    }


    const updateData: any = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (username) updateData.username = username;
    if (name !== undefined) updateData.name = name || null;

    // Handle password reset
    let newPassword = null;
    if (resetPassword) {
      newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const bcrypt = await import('bcryptjs');
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const response: any = { 
      success: true, 
      user: updatedUser 
    };

    if (newPassword) {
      response.newPassword = newPassword;
      response.message = 'User updated and password reset. Share the new temporary password with them.';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
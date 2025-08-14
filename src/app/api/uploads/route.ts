import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uploads = await prisma.upload.findMany({
      include: {
        snapshots: {
          select: {
            id: true,
            timestamp: true,
            kingdom: true,
            players: {
              select: {
                id: true
              }
            }
          }
        },
        uploadedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Last 50 uploads
    });

    const uploadsWithStats = uploads.map((upload: any) => ({
      id: upload.id,
      filename: upload.filename,
      status: upload.status,
      error: upload.error,
      rowsProcessed: upload.rowsProcessed,
      createdAt: upload.createdAt,
      uploadedBy: upload.uploadedBy,
      snapshots: upload.snapshots.map((snapshot: any) => ({
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        kingdom: snapshot.kingdom,
        playerCount: snapshot.players.length
      }))
    }));

    return NextResponse.json(uploadsWithStats);

  } catch (error) {
    console.error('Error fetching uploads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload history' },
      { status: 500 }
    );
  }
}
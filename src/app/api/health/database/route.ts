import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkDatabaseHealth, getDatabaseMetrics } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admins to view detailed database health
    if (!session || session.user.role !== 'ADMIN') {
      // Return basic health check for non-admins
      const health = await checkDatabaseHealth();
      return NextResponse.json({
        isHealthy: health.isHealthy,
        timestamp: new Date().toISOString()
      });
    }

    // Detailed health check for admins
    const [health, metrics] = await Promise.all([
      checkDatabaseHealth(),
      Promise.resolve(getDatabaseMetrics())
    ]);
    
    return NextResponse.json({
      health,
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in database health check:', error);
    return NextResponse.json({
      isHealthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
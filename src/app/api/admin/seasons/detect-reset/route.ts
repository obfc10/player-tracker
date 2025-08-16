import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get the last 10 snapshots to analyze merit trends
    const recentSnapshots = await prisma.snapshot.findMany({
      include: {
        players: {
          select: {
            merits: true,
            playerId: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    if (recentSnapshots.length < 3) {
      return NextResponse.json({ 
        resetDetected: false,
        message: 'Not enough snapshots to analyze merit trends'
      });
    }

    // Analyze merit drops between consecutive snapshots
    let resetDetected = false;
    let resetDate = null;
    let resetSnapshot = null;

    for (let i = 0; i < recentSnapshots.length - 1; i++) {
      const current = recentSnapshots[i];
      const previous = recentSnapshots[i + 1];

      // Create merit maps for comparison
      const currentMerits = new Map(
        current.players.map(p => [p.playerId, parseInt(p.merits || '0')])
      );
      const previousMerits = new Map(
        previous.players.map(p => [p.playerId, parseInt(p.merits || '0')])
      );

      // Find players in both snapshots
      const commonPlayers = Array.from(currentMerits.keys()).filter(id => 
        previousMerits.has(id)
      );

      if (commonPlayers.length < 10) continue; // Need enough players for valid comparison

      // Check for widespread merit decreases (merit reset indicator)
      let playersWithDecrease = 0;
      let totalMeritDrop = 0;
      let significantDrops = 0;

      commonPlayers.forEach(playerId => {
        const currentMerit = currentMerits.get(playerId) || 0;
        const previousMerit = previousMerits.get(playerId) || 0;
        
        if (currentMerit < previousMerit) {
          playersWithDecrease++;
          const drop = previousMerit - currentMerit;
          totalMeritDrop += drop;
          
          // Significant drop is losing more than 50% of merits or 100k+ merits
          if (drop > previousMerit * 0.5 || drop > 100000) {
            significantDrops++;
          }
        }
      });

      const decreasePercentage = (playersWithDecrease / commonPlayers.length) * 100;
      const significantDropPercentage = (significantDrops / commonPlayers.length) * 100;

      // Reset detection criteria:
      // - More than 70% of players have merit decreases
      // - More than 30% have significant drops
      // - Average merit drop is substantial
      if (decreasePercentage > 70 && significantDropPercentage > 30) {
        resetDetected = true;
        resetDate = current.timestamp;
        resetSnapshot = current;
        break;
      }
    }

    if (resetDetected && resetDate && resetSnapshot) {
      // Generate suggested season name
      const seasonNumber = await prisma.season.count() + 1;
      const resetMonth = new Date(resetDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const suggestedSeasonName = `Season ${seasonNumber} (${resetMonth})`;

      return NextResponse.json({
        resetDetected: true,
        resetDate: resetDate,
        resetSnapshotId: resetSnapshot.id,
        suggestedSeasonName,
        message: `Merit reset detected in snapshot from ${new Date(resetDate).toLocaleDateString()}`
      });
    }

    return NextResponse.json({
      resetDetected: false,
      message: 'No merit reset detected in recent snapshots'
    });

  } catch (error) {
    console.error('Error detecting merit reset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
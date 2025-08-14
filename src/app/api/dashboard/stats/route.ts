import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get the latest snapshot for statistics
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { timestamp: 'desc' },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        totalPlayers: 0,
        activeAlliances: 0,
        totalPower: 0,
        lastUpdate: null,
        recentUploads: 0
      });
    }

    // Calculate basic stats
    const totalPlayers = latestSnapshot.players.length;
    
    // Get unique alliances
    const alliances = new Set(
      latestSnapshot.players
        .map((p: any) => p.allianceTag)
        .filter((tag: any) => tag && tag.trim() !== '')
    );
    const activeAlliances = alliances.size;

    // Calculate total kingdom power
    const totalPower = latestSnapshot.players.reduce((sum: number, player: any) => {
      return sum + parseInt(player.currentPower || '0');
    }, 0);

    // Get recent uploads count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUploads = await prisma.upload.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: 'COMPLETED'
      }
    });

    // Get alliance distribution for charts
    const allianceDistribution = Array.from(alliances).map(alliance => {
      const memberCount = latestSnapshot.players.filter((p: any) => p.allianceTag === alliance).length;
      const alliancePower = latestSnapshot.players
        .filter((p: any) => p.allianceTag === alliance)
        .reduce((sum: number, player: any) => sum + parseInt(player.currentPower || '0'), 0);
      
      return {
        name: alliance,
        memberCount,
        totalPower: alliancePower
      };
    }).sort((a, b) => b.totalPower - a.totalPower).slice(0, 10); // Top 10 alliances

    // Get top players
    const topPlayers = latestSnapshot.players
      .sort((a: any, b: any) => parseInt(b.currentPower || '0') - parseInt(a.currentPower || '0'))
      .slice(0, 10)
      .map((player: any) => ({
        lordId: player.playerId,
        name: player.name,
        currentPower: parseInt(player.currentPower || '0'),
        allianceTag: player.allianceTag
      }));

    // Power distribution ranges
    const powerRanges = [
      { label: '0-1M', min: 0, max: 1000000, count: 0 },
      { label: '1M-10M', min: 1000000, max: 10000000, count: 0 },
      { label: '10M-50M', min: 10000000, max: 50000000, count: 0 },
      { label: '50M-100M', min: 50000000, max: 100000000, count: 0 },
      { label: '100M+', min: 100000000, max: Infinity, count: 0 }
    ];

    latestSnapshot.players.forEach((player: any) => {
      const power = parseInt(player.currentPower || '0');
      for (const range of powerRanges) {
        if (power >= range.min && power < range.max) {
          range.count++;
          break;
        }
      }
    });

    return NextResponse.json({
      totalPlayers,
      activeAlliances,
      totalPower,
      lastUpdate: latestSnapshot.timestamp,
      recentUploads,
      allianceDistribution,
      topPlayers,
      powerDistribution: powerRanges,
      snapshotInfo: {
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename,
        timestamp: latestSnapshot.timestamp
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
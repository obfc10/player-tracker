import { prisma } from '@/lib/db';
import { Player, PlayerSnapshot, NameChange, AllianceChange, PlayerWithHistory } from '@/types/player';
import { DatabaseError } from '@/types/api';

export class PlayerRepository {
  async findByLordId(lordId: string): Promise<Player | null> {
    try {
      return await prisma.player.findUnique({
        where: { lordId }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to find player by lordId: ${lordId}`, error);
    }
  }

  async findByLordIdWithHistory(lordId: string): Promise<PlayerWithHistory | null> {
    try {
      return await prisma.player.findUnique({
        where: { lordId },
        include: {
          nameHistory: {
            orderBy: { detectedAt: 'desc' },
            take: 50
          },
          allianceHistory: {
            orderBy: { detectedAt: 'desc' },
            take: 50
          },
          snapshots: {
            include: { snapshot: true },
            orderBy: { snapshot: { timestamp: 'desc' } },
            take: 100
          }
        }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to find player with history: ${lordId}`, error);
    }
  }

  async upsert(lordId: string, data: Partial<Player>): Promise<Player> {
    try {
      return await prisma.player.upsert({
        where: { lordId },
        update: data,
        create: {
          lordId,
          currentName: data.currentName || '',
          ...data
        }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to upsert player: ${lordId}`, error);
    }
  }

  async updateRealmStatus(lordId: string, hasLeftRealm: boolean, leftRealmAt?: Date): Promise<void> {
    try {
      await prisma.player.update({
        where: { lordId },
        data: {
          hasLeftRealm,
          leftRealmAt: hasLeftRealm ? leftRealmAt : null
        }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to update realm status for player: ${lordId}`, error);
    }
  }

  async markPlayersAsLeft(lordIds: string[], leftRealmAt: Date): Promise<number> {
    try {
      const result = await prisma.player.updateMany({
        where: {
          lordId: { in: lordIds }
        },
        data: {
          hasLeftRealm: true,
          leftRealmAt
        }
      });
      return result.count;
    } catch (error) {
      throw new DatabaseError(`Failed to mark players as left`, error);
    }
  }

  async findAbsentPlayers(
    currentPlayerIds: string[], 
    cutoffDate: Date, 
    powerFloor: number = 10000000
  ): Promise<(Player & { snapshots: PlayerSnapshot[] })[]> {
    try {
      return await prisma.player.findMany({
        where: {
          AND: [
            { lordId: { notIn: currentPlayerIds } },
            { hasLeftRealm: false },
            { lastSeenAt: { lt: cutoffDate } },
            { lastSeenAt: { not: null } }
          ]
        },
        include: {
          snapshots: {
            orderBy: { snapshot: { timestamp: 'desc' } },
            take: 1,
            include: { snapshot: true }
          }
        }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to find absent players`, error);
    }
  }

  async createNameChange(data: Omit<NameChange, 'id'>): Promise<NameChange> {
    try {
      return await prisma.nameChange.create({
        data
      });
    } catch (error) {
      throw new DatabaseError(`Failed to create name change record`, error);
    }
  }

  async createAllianceChange(data: Omit<AllianceChange, 'id'>): Promise<AllianceChange> {
    try {
      return await prisma.allianceChange.create({
        data
      });
    } catch (error) {
      throw new DatabaseError(`Failed to create alliance change record`, error);
    }
  }

  async getLatestSnapshots(playerIds: string[], beforeTimestamp?: Date): Promise<PlayerSnapshot[]> {
    try {
      const latestSnapshotQuery = await prisma.snapshot.findFirst({
        where: beforeTimestamp ? { timestamp: { lt: beforeTimestamp } } : undefined,
        orderBy: { timestamp: 'desc' }
      });

      if (!latestSnapshotQuery) {
        return [];
      }

      return await prisma.playerSnapshot.findMany({
        where: {
          playerId: { in: playerIds },
          snapshotId: latestSnapshotQuery.id
        },
        include: { snapshot: true }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get latest snapshots`, error);
    }
  }
}
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

  async getPlayerSnapshotsBySnapshotId(snapshotId: string, playerIds?: string[]): Promise<PlayerSnapshot[]> {
    try {
      const whereClause: any = { snapshotId };
      if (playerIds && playerIds.length > 0) {
        whereClause.playerId = { in: playerIds };
      }

      return await prisma.playerSnapshot.findMany({
        where: whereClause,
        include: { snapshot: true }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get player snapshots by snapshot ID`, error);
    }
  }

  async findManyByIds(lordIds: string[]): Promise<Player[]> {
    try {
      return await prisma.player.findMany({
        where: {
          lordId: { in: lordIds }
        }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to find players by IDs`, error);
    }
  }

  async findAllWithBasicInfo(filters: {
    includeLeftRealm?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Player[]> {
    try {
      const { includeLeftRealm = false, limit, offset } = filters;
      
      const whereClause: any = {};
      if (!includeLeftRealm) {
        whereClause.hasLeftRealm = false;
      }

      return await prisma.player.findMany({
        where: whereClause,
        orderBy: { lastSeenAt: 'desc' },
        ...(limit ? { take: limit } : {}),
        ...(offset ? { skip: offset } : {})
      });
    } catch (error) {
      throw new DatabaseError(`Failed to find players with basic info`, error);
    }
  }

  async batchUpsert(updates: Array<{ lordId: string; currentName: string }>): Promise<void> {
    try {
      // Use a transaction for batch updates to ensure consistency
      await prisma.$transaction(
        updates.map(update => 
          prisma.player.upsert({
            where: { lordId: update.lordId },
            update: { currentName: update.currentName },
            create: {
              lordId: update.lordId,
              currentName: update.currentName,
              hasLeftRealm: false
            }
          })
        )
      );
    } catch (error) {
      throw new DatabaseError(`Failed to batch upsert players`, error);
    }
  }
}
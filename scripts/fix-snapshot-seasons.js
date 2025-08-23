const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSnapshotSeasons() {
  try {
    console.log('🔍 Checking current state...');
    
    // Get the active season
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true }
    });
    
    if (!activeSeason) {
      console.error('❌ No active season found!');
      return;
    }
    
    console.log(`✅ Active season found: ${activeSeason.name} (${activeSeason.id})`);
    
    // Count snapshots without season
    const unlinkedSnapshots = await prisma.snapshot.count({
      where: { seasonId: null }
    });
    
    console.log(`📊 Found ${unlinkedSnapshots} snapshots without season assignment`);
    
    if (unlinkedSnapshots === 0) {
      console.log('✅ All snapshots already have seasons assigned!');
      return;
    }
    
    // Update all snapshots with null seasonId to use the active season
    const updateResult = await prisma.snapshot.updateMany({
      where: { seasonId: null },
      data: { seasonId: activeSeason.id }
    });
    
    console.log(`✅ Updated ${updateResult.count} snapshots to use season: ${activeSeason.name}`);
    
    // Verify the fix
    const remainingUnlinked = await prisma.snapshot.count({
      where: { seasonId: null }
    });
    
    console.log(`📊 Snapshots still without season: ${remainingUnlinked}`);
    
    if (remainingUnlinked === 0) {
      console.log('🎉 All snapshots are now properly linked to seasons!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing snapshot seasons:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSnapshotSeasons();
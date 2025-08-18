const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedRowData() {
  console.log('🌱 Seeding ROW data...');

  // Create default event roles
  const roles = [
    { name: 'Commander', description: 'Leads the team and coordinates strategy', sortOrder: 1, color: '#DC2626' },
    { name: 'Tank', description: 'Front-line defense specialist', sortOrder: 2, color: '#2563EB' },
    { name: 'Flanker', description: 'Mobile attack unit', sortOrder: 3, color: '#16A34A' },
    { name: 'Archer', description: 'Ranged combat specialist', sortOrder: 4, color: '#CA8A04' },
    { name: 'Cavalry', description: 'Mounted combat unit', sortOrder: 5, color: '#7C3AED' },
    { name: 'Support', description: 'Logistics and backup support', sortOrder: 6, color: '#DB2777' },
    { name: 'Scout', description: 'Reconnaissance and intelligence', sortOrder: 7, color: '#059669' },
    { name: 'Engineer', description: 'Siege equipment and fortifications', sortOrder: 8, color: '#DC2626' }
  ];

  for (const role of roles) {
    await prisma.eventRole.upsert({
      where: { name: role.name },
      update: {},
      create: role
    });
  }

  console.log('✅ Created event roles');

  // Create sample persistent teams
  const teams = [
    { name: 'Alpha Squad', description: 'Primary assault team', color: '#DC2626', isActive: true },
    { name: 'Beta Force', description: 'Secondary support team', color: '#2563EB', isActive: true },
    { name: 'Gamma Wing', description: 'Specialized tactical unit', color: '#16A34A', isActive: true }
  ];

  for (const team of teams) {
    await prisma.persistentTeam.upsert({
      where: { name: team.name },
      update: {},
      create: team
    });
  }

  console.log('✅ Created persistent teams');

  console.log('🎉 ROW data seeding completed!');
}

async function main() {
  try {
    await seedRowData();
  } catch (error) {
    console.error('❌ Error seeding ROW data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedRowData };
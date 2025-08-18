const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEventTypes() {
  console.log('🌱 Seeding event types...');

  const eventTypes = [
    {
      name: 'Kingdom vs Kingdom (KvK)',
      description: 'Large-scale battles between kingdoms for territorial control and rewards'
    },
    {
      name: 'Cross-Server Event',
      description: 'Competitive events that span multiple servers and kingdoms'
    },
    {
      name: 'Kingdom Defense',
      description: 'Defensive operations protecting kingdom territory from invaders'
    },
    {
      name: 'Alliance War',
      description: 'Coordinated warfare between major alliances within or across kingdoms'
    },
    {
      name: 'Special Event',
      description: 'Limited-time events with unique mechanics and exclusive rewards'
    },
    {
      name: 'Training Exercise',
      description: 'Practice events for alliance coordination and strategy testing'
    }
  ];

  for (const eventType of eventTypes) {
    try {
      const existing = await prisma.eventType.findUnique({
        where: { name: eventType.name }
      });

      if (!existing) {
        await prisma.eventType.create({
          data: eventType
        });
        console.log(`✅ Created event type: ${eventType.name}`);
      } else {
        console.log(`⏭️  Event type already exists: ${eventType.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating event type ${eventType.name}:`, error);
    }
  }
}

async function main() {
  try {
    await seedEventTypes();
    console.log('🎉 Event types seeding completed!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
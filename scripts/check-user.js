const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users in database:', users.length);
    
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (admin) {
      console.log('✅ Admin user found:', {
        email: admin.email,
        name: admin.name,
        role: admin.role,
        hasPassword: !!admin.password
      });
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
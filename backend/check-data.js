const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const userCount = await prisma.user.count();
    const callCount = await prisma.call.count();
    console.log(`Users: ${userCount}`);
    console.log(`Calls: ${callCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({ take: 5 });
      console.log('Sample Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
    }
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();

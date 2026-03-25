const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany();
  console.log('--- Database Users ---');
  for (const u of users) {
    console.log(`Email: ${u.email}, Role: ${u.role}`);
    const passwordsToTest = ['123', 'password123'];
    for (const p of passwordsToTest) {
      const match = await bcrypt.compare(p, u.password);
      console.log(`  Testing "${p}": ${match ? 'MATCH ✅' : 'NO MATCH ❌'}`);
    }
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

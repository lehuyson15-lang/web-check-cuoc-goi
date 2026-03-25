const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const calls = await prisma.call.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      segments: true
    }
  });

  console.log('Recent calls:', JSON.stringify(calls, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

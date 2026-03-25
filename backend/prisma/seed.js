const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Admin
  const adminHashedPassword = await bcrypt.hash('123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinic.com' },
    update: { password: adminHashedPassword },
    create: {
      name: 'Clinic Manager',
      email: 'admin@clinic.com',
      password: adminHashedPassword,
      role: 'ADMIN',
      extensionVoip: '101'
    }
  });

  // 2. Create Employee
  const employee = await prisma.user.upsert({
    where: { email: 'staff@clinic.com' },
    update: {},
    create: {
      name: 'Telesale Staff',
      email: 'staff@clinic.com',
      password: hashedPassword,
      role: 'USER',
      extensionVoip: '102'
    }
  });

  // 3. Create Sample Calls
  const calls = [
    {
      userId: employee.id,
      customerPhone: '0987123456',
      direction: 'OUTBOUND',
      source: 'MANUAL',
      durationSeconds: 125,
      calledAt: new Date(),
      serviceType: 'Hút mỡ bụng',
      result: 'CLOSED',
      notes: 'Khách hàng rất quan tâm, đã chốt lịch hẹn.',
      transcriptStatus: 'DONE'
    },
    {
      userId: employee.id,
      customerPhone: '0912334455',
      direction: 'INBOUND',
      source: 'VOIP',
      durationSeconds: 45,
      calledAt: new Date(Date.now() - 3600000),
      serviceType: 'Tư vấn da liễu',
      result: 'CALLBACK',
      notes: 'Đang cân nhắc giá, gọi lại sau 2 ngày.',
      transcriptStatus: 'DONE'
    }
  ];

  for (const callData of calls) {
    const call = await prisma.call.create({ data: callData });
    
    // Sample Transcripts
    await prisma.transcriptSegment.createMany({
      data: [
        { callId: call.id, speaker: 'agent', startTime: 0, endTime: 5, text: 'Dạ em chào anh/chị ạ, em gọi từ phòng khám thẩm mỹ.' },
        { callId: call.id, speaker: 'customer', startTime: 6, endTime: 12, text: 'Chào em, anh đang quan tâm đến dịch vụ hút mỡ bụng bên mình.' }
      ]
    });

    // Sample Tags
    await prisma.callTag.create({
      data: { callId: call.id, tagType: 'service', tagValue: callData.serviceType }
    });
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

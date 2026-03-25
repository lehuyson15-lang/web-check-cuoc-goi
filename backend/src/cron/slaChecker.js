const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkSla = async () => {
  try {
    const now = new Date();
    // Find leads where deadline passed and not yet notified
    const expiredLeads = await prisma.lead.findMany({
      where: {
        status: 'NEW',
        slaDeadline: {
          lt: now,
        },
        slaNotified: false,
      },
      include: {
        assignedTo: true,
      },
    });

    if (expiredLeads.length > 0) {
      console.log(`[SLA Checker] Found ${expiredLeads.length} expired leads.`);
    }

    for (const lead of expiredLeads) {
      // Create notification for the user
      await prisma.notification.create({
        data: {
          userId: lead.assignedToId,
          message: `🚫 Quá hạn gọi SĐT ${lead.customerPhone} (Tên khách: ${lead.customerName || 'Chưa rõ'}). Vui lòng gọi ngay để tránh trễ SLA!`,
        },
      });

      // Mark lead as notified
      await prisma.lead.update({
        where: { id: lead.id },
        data: { slaNotified: true, status: 'EXPIRED' },
      });
      
      console.log(`[SLA Checker] Lead ${lead.customerPhone} expired. Notified user ${lead.assignedTo.email}.`);
    }
    // Part 2: Check Recall Notifications (3d, 7d, 1m)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Check 30-day recalls (Check longest first to avoid multiple notifications in one run if both passed)
    const calls30d = await prisma.call.findMany({
      where: { calledAt: { lt: thirtyDaysAgo }, recallNotified30d: false },
    });
    for (const call of calls30d) {
      await prisma.notification.create({
        data: {
          userId: call.userId,
          message: `⏰ Nhắc nhở (1 tháng): Đã quá 30 ngày từ cuộc gọi cuối với ${call.customerPhone}. Vui lòng gọi lại!`,
        },
      });
      await prisma.call.update({
        where: { id: call.id },
        data: { recallNotified30d: true, recallNotified7d: true, recallNotified3d: true }
      });
    }

    // 2. Check 7-day recalls
    const calls7d = await prisma.call.findMany({
      where: { calledAt: { lt: sevenDaysAgo }, recallNotified7d: false },
    });
    for (const call of calls7d) {
      await prisma.notification.create({
        data: {
          userId: call.userId,
          message: `⏰ Nhắc nhở (7 ngày): Đã quá 1 tuần từ cuộc gọi với ${call.customerPhone}. Vui lòng gọi lại chăm sóc khách!`,
        },
      });
      await prisma.call.update({
        where: { id: call.id },
        data: { recallNotified7d: true, recallNotified3d: true }
      });
    }

    // 3. Check 3-day recalls
    const calls3d = await prisma.call.findMany({
      where: { calledAt: { lt: threeDaysAgo }, recallNotified3d: false },
    });
    for (const call of calls3d) {
      await prisma.notification.create({
        data: {
          userId: call.userId,
          message: `⏰ Nhắc nhở (3 ngày): Đã 3 ngày trôi qua từ cuộc gọi với ${call.customerPhone}. Bạn nên gọi lại nhé!`,
        },
      });
      await prisma.call.update({
        where: { id: call.id },
        data: { recallNotified3d: true }
      });
    }

  } catch (error) {
    console.error('[SLA Checker] Error checking SLA/Recalls:', error);
  }
};

const startSlaChecker = () => {
  console.log('SLA Checker started. Running every 1 minute.');
  // setInterval(checkSla, 60 * 1000);
  
  // For easier testing during dev, we can use a recursive timeout pattern
  const loop = async () => {
    await checkSla();
    setTimeout(loop, 60 * 1000);
  }
  
  loop();
};

module.exports = { startSlaChecker, checkSla };

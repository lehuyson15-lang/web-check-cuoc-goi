const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware, managerMiddleware } = require('../services/authMiddleware');

const prisma = new PrismaClient();

// ── GET /queues — List all dispatch queues ────────────────────────────────────
router.get('/queues', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const queues = await prisma.dispatchQueue.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, status: true, phoneNumber: true, department: true } } },
          orderBy: { sortOrder: 'asc' }
        },
        _count: { select: { dispatches: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(queues);
  } catch (error) {
    console.error('[Dispatch] List queues error:', error);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

// ── POST /queues — Create a new dispatch queue ────────────────────────────────
router.post('/queues', authMiddleware, managerMiddleware, async (req, res) => {
  const { name, memberIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Queue name is required' });

  try {
    const queue = await prisma.dispatchQueue.create({
      data: {
        name,
        members: memberIds?.length ? {
          create: memberIds.map((userId, i) => ({
            userId,
            sortOrder: i,
            isActive: true
          }))
        } : undefined
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, status: true } } },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    res.json(queue);
  } catch (error) {
    console.error('[Dispatch] Create queue error:', error);
    res.status(500).json({ error: 'Failed to create queue' });
  }
});

// ── PUT /queues/:id — Update a queue (name, members, order) ──────────────────
router.put('/queues/:id', authMiddleware, managerMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, members } = req.body; // members: [{ userId, sortOrder, isActive }]

  try {
    // Update queue name
    await prisma.dispatchQueue.update({
      where: { id },
      data: { name: name || undefined }
    });

    // Update members if provided
    if (members && Array.isArray(members)) {
      // Delete removed members
      const memberUserIds = members.map(m => m.userId);
      await prisma.dispatchMember.deleteMany({
        where: { queueId: id, userId: { notIn: memberUserIds } }
      });

      // Upsert members
      for (const m of members) {
        await prisma.dispatchMember.upsert({
          where: { queueId_userId: { queueId: id, userId: m.userId } },
          create: {
            queueId: id,
            userId: m.userId,
            sortOrder: m.sortOrder,
            isActive: m.isActive !== false
          },
          update: {
            sortOrder: m.sortOrder,
            isActive: m.isActive !== false
          }
        });
      }
    }

    // Fetch updated queue
    const queue = await prisma.dispatchQueue.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, status: true, phoneNumber: true, department: true } } },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    res.json(queue);
  } catch (error) {
    console.error('[Dispatch] Update queue error:', error);
    res.status(500).json({ error: 'Failed to update queue' });
  }
});

// ── DELETE /queues/:id — Delete a queue ───────────────────────────────────────
router.delete('/queues/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.dispatchQueue.delete({ where: { id } });
    res.json({ message: 'Queue deleted' });
  } catch (error) {
    console.error('[Dispatch] Delete queue error:', error);
    res.status(500).json({ error: 'Failed to delete queue' });
  }
});

// ── POST /up — Round-robin assign a phone number ─────────────────────────────
router.post('/up', authMiddleware, managerMiddleware, async (req, res) => {
  const { customerPhone, customerName, source, queueId, slaMinutes = 15 } = req.body;

  if (!customerPhone) return res.status(400).json({ error: 'Phone number is required' });
  if (!queueId) return res.status(400).json({ error: 'Queue ID is required' });

  try {
    // Get queue with active members
    const queue = await prisma.dispatchQueue.findUnique({
      where: { id: queueId },
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, status: true } } },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    // Filter out offline members
    const availableMembers = queue.members.filter(m => 
      m.user.status !== 'offline' && m.user.status !== 'pending'
    );

    if (availableMembers.length === 0) {
      return res.status(400).json({ error: 'Không có nhân viên nào sẵn sàng nhận SĐT. Tất cả đều offline hoặc đã tắt.' });
    }

    // Round-robin: find next member starting from currentIndex
    const totalMembers = queue.members.length; // use full member list for index tracking
    let assignedMember = null;
    let newIndex = queue.currentIndex;

    // Try each member position starting from currentIndex
    for (let attempt = 0; attempt < totalMembers; attempt++) {
      const idx = (queue.currentIndex + attempt) % totalMembers;
      const member = queue.members[idx];
      
      // Check if this member is available (active + not offline)
      if (member && member.isActive && member.user.status !== 'offline' && member.user.status !== 'pending') {
        assignedMember = member;
        newIndex = (idx + 1) % totalMembers;
        break;
      }
    }

    if (!assignedMember) {
      return res.status(400).json({ error: 'Không tìm được nhân viên hợp lệ trong hàng đợi.' });
    }

    const assignedAt = new Date();
    const slaDeadline = new Date(assignedAt.getTime() + slaMinutes * 60000);

    // Create dispatch record
    const dispatch = await prisma.dispatch.create({
      data: {
        queueId,
        customerPhone,
        customerName,
        source,
        assignedToId: assignedMember.userId,
        slaMinutes,
        slaDeadline,
        assignedAt
      },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });

    // Update queue currentIndex
    await prisma.dispatchQueue.update({
      where: { id: queueId },
      data: { currentIndex: newIndex }
    });

    // Create notification for employee
    await prisma.notification.create({
      data: {
        userId: assignedMember.userId,
        message: `📲 SĐT mới: ${customerPhone}${customerName ? ` (${customerName})` : ''} — Nguồn: ${source || 'Không rõ'}. Hãy gọi trong vòng ${slaMinutes} phút!`
      }
    });

    // Also create a Lead record for SLA tracking
    await prisma.lead.create({
      data: {
        customerPhone,
        customerName,
        assignedToId: assignedMember.userId,
        slaDeadline,
        assignedAt
      }
    });

    res.json({
      dispatch,
      assignedTo: assignedMember.user,
      nextIndex: newIndex,
      message: `✅ Đã giao ${customerPhone} cho ${assignedMember.user.name}`
    });

  } catch (error) {
    console.error('[Dispatch] Up error:', error);
    res.status(500).json({ error: 'Failed to dispatch phone number' });
  }
});

// ── POST /up-bulk — Dispatch multiple phone numbers ──────────────────────────
router.post('/up-bulk', authMiddleware, managerMiddleware, async (req, res) => {
  const { phones, queueId, source, slaMinutes = 15 } = req.body;
  // phones: [{ phone, name }]
  
  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ error: 'Phone list is required' });
  }
  if (!queueId) return res.status(400).json({ error: 'Queue ID is required' });

  const results = [];
  for (const p of phones) {
    try {
      // Re-use the /up logic by making internal call
      const queue = await prisma.dispatchQueue.findUnique({
        where: { id: queueId },
        include: {
          members: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, status: true } } },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      if (!queue) { results.push({ phone: p.phone, error: 'Queue not found' }); continue; }

      const totalMembers = queue.members.length;
      let assignedMember = null;
      let newIndex = queue.currentIndex;

      for (let attempt = 0; attempt < totalMembers; attempt++) {
        const idx = (queue.currentIndex + attempt) % totalMembers;
        const member = queue.members[idx];
        if (member && member.isActive && member.user.status !== 'offline' && member.user.status !== 'pending') {
          assignedMember = member;
          newIndex = (idx + 1) % totalMembers;
          break;
        }
      }

      if (!assignedMember) { results.push({ phone: p.phone, error: 'No available member' }); continue; }

      const assignedAt = new Date();
      const slaDeadline = new Date(assignedAt.getTime() + slaMinutes * 60000);

      const dispatch = await prisma.dispatch.create({
        data: {
          queueId, customerPhone: p.phone, customerName: p.name, source,
          assignedToId: assignedMember.userId, slaMinutes, slaDeadline, assignedAt
        }
      });

      await prisma.dispatchQueue.update({
        where: { id: queueId },
        data: { currentIndex: newIndex }
      });

      await prisma.notification.create({
        data: {
          userId: assignedMember.userId,
          message: `📲 SĐT mới: ${p.phone}${p.name ? ` (${p.name})` : ''} — Nguồn: ${source || 'Không rõ'}`
        }
      });

      await prisma.lead.create({
        data: { customerPhone: p.phone, customerName: p.name, assignedToId: assignedMember.userId, slaDeadline, assignedAt }
      });

      results.push({ phone: p.phone, assignedTo: assignedMember.user.name, dispatchId: dispatch.id });
    } catch (err) {
      results.push({ phone: p.phone, error: err.message });
    }
  }

  res.json({ total: phones.length, results });
});

// ── GET /history — Dispatch history ──────────────────────────────────────────
router.get('/history', authMiddleware, managerMiddleware, async (req, res) => {
  const { queueId, limit = 50, from, to } = req.query;
  
  try {
    const where = {};
    if (queueId) where.queueId = queueId;
    if (from || to) {
      where.assignedAt = {};
      if (from) where.assignedAt.gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23,59,59,999); where.assignedAt.lte = d; }
    }

    const dispatches = await prisma.dispatch.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        queue: { select: { name: true } }
      },
      orderBy: { assignedAt: 'desc' },
      take: parseInt(limit)
    });
    res.json(dispatches);
  } catch (error) {
    console.error('[Dispatch] History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── PATCH /:id/status — Update dispatch status ──────────────────────────────
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body; // PENDING, CALLED, CANCELLED

  try {
    const dispatch = await prisma.dispatch.update({
      where: { id },
      data: { status, note: note || undefined },
      include: { assignedTo: { select: { id: true, name: true } } }
    });
    res.json(dispatch);
  } catch (error) {
    console.error('[Dispatch] Status update error:', error);
    res.status(500).json({ error: 'Failed to update dispatch status' });
  }
});

// ── GET /my-phones — Get dispatches assigned to current user ────────────────
router.get('/my-phones', authMiddleware, async (req, res) => {
  try {
    const dispatches = await prisma.dispatch.findMany({
      where: { assignedToId: req.user.userId },
      include: {
        queue: { select: { name: true } }
      },
      orderBy: { assignedAt: 'desc' },
      take: 50
    });
    res.json(dispatches);
  } catch (error) {
    console.error('[Dispatch] My phones error:', error);
    res.status(500).json({ error: 'Failed to fetch dispatches' });
  }
});

// ── GET /users — List all users suitable for dispatch queues ────────────────
router.get('/users', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, status: true, phoneNumber: true, department: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error('[Dispatch] Users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;

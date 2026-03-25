const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../services/authMiddleware');

const prisma = new PrismaClient();

// KPI Dashboard Stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const isLevelAdmin = req.user.role === 'ADMIN';
    const userId = req.user.userId;

    const baseWhere = isLevelAdmin ? {} : { userId };

    const [totalCalls, missedCalls, closedCalls, avgDuration] = await Promise.all([
      prisma.call.count({ where: baseWhere }),
      prisma.call.count({ where: { ...baseWhere, result: 'NO_ANSWER' } }),
      prisma.call.count({ where: { ...baseWhere, result: 'CLOSED' } }),
      prisma.call.aggregate({
        where: baseWhere,
        _avg: { durationSeconds: true }
      })
    ]);

    res.json({
      totalCalls,
      missedCalls,
      closedCalls,
      avgDuration: Math.round(avgDuration._avg.durationSeconds || 0),
      conversionRate: totalCalls > 0 ? (closedCalls / totalCalls) * 100 : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// KPI Report per Employee
router.get('/kpi', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        calls: true
      }
    });

    const kpi = users.map(user => {
      const total = user.calls.length;
      const closed = user.calls.filter(c => c.result === 'CLOSED').length;
      const missed = user.calls.filter(c => c.result === 'NO_ANSWER').length;
      const totalDuration = user.calls.reduce((acc, c) => acc + c.durationSeconds, 0);

      return {
        id: user.id,
        name: user.name,
        totalCalls: total,
        closedCalls: closed,
        missedCalls: missed,
        avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
        conversionRate: total > 0 ? (closed / total) * 100 : 0
      };
    });

    res.json(kpi);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;

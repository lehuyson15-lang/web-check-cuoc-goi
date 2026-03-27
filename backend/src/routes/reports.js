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

// Call Report - Aggregated by day/month/year per employee
router.get('/call-report', authMiddleware, async (req, res) => {
  try {
    const { mode = 'day', from, to, userId } = req.query;
    const isAdmin = req.user.role === 'ADMIN';

    // Build date filter
    const now = new Date();
    let dateFrom = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    let dateTo = to ? new Date(to) : now;
    // Set dateTo to end of day
    dateTo.setHours(23, 59, 59, 999);

    const where = {
      calledAt: { gte: dateFrom, lte: dateTo },
      ...(userId && userId !== 'all' ? { userId } : {}),
      ...(!isAdmin ? { userId: req.user.userId } : {})
    };

    const calls = await prisma.call.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { calledAt: 'asc' }
    });

    // Get all employees for the report
    const employees = isAdmin
      ? await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : [{ id: req.user.userId, name: req.user.name || 'Bạn' }];

    // Period key formatter
    const getPeriodKey = (date) => {
      const d = new Date(date);
      if (mode === 'day') return d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (mode === 'month') return d.toISOString().slice(0, 7); // YYYY-MM
      return String(d.getFullYear()); // YYYY
    };

    // Collect all unique periods
    const periodSet = new Set();
    calls.forEach(c => periodSet.add(getPeriodKey(c.calledAt)));
    const periods = Array.from(periodSet).sort();

    // Build data map: { userId: { period: { stats } } }
    const data = {};
    const totals = {};

    // Initialize
    employees.forEach(emp => { data[emp.id] = {}; });
    periods.forEach(p => {
      totals[p] = { totalCalls: 0, closed: 0, missed: 0, pending: 0, callback: 0, totalDuration: 0, notes: [] };
    });

    calls.forEach(c => {
      const pk = getPeriodKey(c.calledAt);
      const uid = c.userId;

      if (!data[uid]) data[uid] = {};
      if (!data[uid][pk]) {
        data[uid][pk] = { totalCalls: 0, closed: 0, missed: 0, pending: 0, callback: 0, totalDuration: 0, notes: [] };
      }

      const cell = data[uid][pk];
      cell.totalCalls++;
      cell.totalDuration += c.durationSeconds || 0;
      if (c.result === 'CLOSED') cell.closed++;
      else if (c.result === 'NO_ANSWER') cell.missed++;
      else if (c.result === 'CALLBACK') cell.callback++;
      else cell.pending++;
      if (c.notes) cell.notes.push({ phone: c.customerPhone, name: c.customerName, notes: c.notes, result: c.result, calledAt: c.calledAt, duration: c.durationSeconds });

      // Totals
      const tot = totals[pk];
      tot.totalCalls++;
      tot.totalDuration += c.durationSeconds || 0;
      if (c.result === 'CLOSED') tot.closed++;
      else if (c.result === 'NO_ANSWER') tot.missed++;
      else if (c.result === 'CALLBACK') tot.callback++;
      else tot.pending++;
      if (c.notes) tot.notes.push({ phone: c.customerPhone, name: c.customerName, notes: c.notes, result: c.result, calledAt: c.calledAt, duration: c.durationSeconds, empName: c.user?.name });
    });

    res.json({ employees, periods, data, totals });
  } catch (error) {
    console.error('[Call Report] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Manual trigger for Lark Report (Admin only)
router.post('/send-lark', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { type } = req.body; // 'daily', 'weekly', 'monthly'
    const { sendTestReport } = require('../cron/larkReporter');
    await sendTestReport(type);
    res.json({ message: `Đã gửi lệnh báo cáo ${type} qua Lark thành công.` });
  } catch (error) {
    console.error('[Send Lark API] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;

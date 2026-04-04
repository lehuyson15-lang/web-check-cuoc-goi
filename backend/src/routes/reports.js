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

// Helper: get ISO week key (YYYY-Wxx)
const getISOWeekKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

// Call Report - Aggregated by day/week/month/year per employee
router.get('/call-report', authMiddleware, async (req, res) => {
  try {
    const { mode = 'day', from, to, userId, direction } = req.query;
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
      ...(!isAdmin ? { userId: req.user.userId } : {}),
      ...(direction && direction !== 'all' ? { direction } : {})
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

    // Period key formatter (supports day, week, month, year)
    const getPeriodKey = (date) => {
      const d = new Date(date);
      if (mode === 'day') return d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (mode === 'week') return getISOWeekKey(d); // YYYY-Wxx
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
      totals[p] = { totalCalls: 0, closed: 0, missed: 0, pending: 0, callback: 0, totalDuration: 0, notes: [], slaViolations: 0 };
    });

    calls.forEach(c => {
      const pk = getPeriodKey(c.calledAt);
      const uid = c.userId;

      if (!data[uid]) data[uid] = {};
      if (!data[uid][pk]) {
        data[uid][pk] = { totalCalls: 0, closed: 0, missed: 0, pending: 0, callback: 0, totalDuration: 0, notes: [], slaViolations: 0 };
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

    // ── SLA Violations (Lead status = EXPIRED) ──────────────────────────────
    const slaWhere = {
      status: 'EXPIRED',
      slaDeadline: { gte: dateFrom, lte: dateTo },
      ...(userId && userId !== 'all' ? { assignedToId: userId } : {}),
      ...(!isAdmin ? { assignedToId: req.user.userId } : {})
    };

    const expiredLeads = await prisma.lead.findMany({
      where: slaWhere,
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { slaDeadline: 'asc' }
    });

    // slaData: { userId: { period: { count, leads[] } } }
    const slaData = {};
    const slaTotals = {};

    employees.forEach(emp => { slaData[emp.id] = {}; });
    periods.forEach(p => { slaTotals[p] = { count: 0, leads: [] }; });

    expiredLeads.forEach(lead => {
      const pk = getPeriodKey(lead.slaDeadline);
      const uid = lead.assignedToId;

      // Make sure period exists (lead might be in a period not covered by calls)
      if (!slaTotals[pk]) {
        slaTotals[pk] = { count: 0, leads: [] };
        if (!periods.includes(pk)) periods.push(pk);
      }

      if (!slaData[uid]) slaData[uid] = {};
      if (!slaData[uid][pk]) slaData[uid][pk] = { count: 0, leads: [] };

      const leadInfo = {
        phone: lead.customerPhone,
        name: lead.customerName,
        assignedAt: lead.assignedAt,
        deadline: lead.slaDeadline
      };

      slaData[uid][pk].count++;
      slaData[uid][pk].leads.push(leadInfo);
      slaTotals[pk].count++;
      slaTotals[pk].leads.push({ ...leadInfo, empName: lead.assignedTo?.name });

      // Also add to the per-employee cell data
      if (data[uid] && data[uid][pk]) {
        data[uid][pk].slaViolations = (data[uid][pk].slaViolations || 0) + 1;
      }
      if (totals[pk]) {
        totals[pk].slaViolations = (totals[pk].slaViolations || 0) + 1;
      }
    });

    // Re-sort periods in case new ones were added from SLA data
    periods.sort();

    res.json({ employees, periods, data, totals, slaData, slaTotals });
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

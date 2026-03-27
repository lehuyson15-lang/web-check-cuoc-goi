const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LARK_WEBHOOK_URL = process.env.LARK_WEBHOOK_URL;
const LARK_ENABLED = process.env.LARK_REPORT_ENABLED === 'true';
const TIMEZONE_OFFSET = 7; // Vietnam UTC+7

// ── Helpers ──────────────────────────────────────────────────────────────────
const getVNTime = () => {
  const now = new Date();
  return new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
};

const fmtDate = (d) => {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon}/${d.getFullYear()}`;
};

const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ── Send to Lark ─────────────────────────────────────────────────────────────
const sendToLark = async (title, contentLines) => {
  if (!LARK_WEBHOOK_URL) {
    console.log('[Lark] No webhook URL configured, skipping.');
    return;
  }

  const body = {
    msg_type: 'post',
    content: {
      post: {
        vi_vn: {
          title,
          content: contentLines.map(line => {
            if (typeof line === 'string') return [{ tag: 'text', text: line }];
            return line;
          })
        }
      }
    }
  };

  try {
    const res = await fetch(LARK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log(`[Lark] Sent "${title}" — Response:`, data);
    return data;
  } catch (err) {
    console.error('[Lark] Send failed:', err.message);
  }
};

// ── Build Report Data ────────────────────────────────────────────────────────
const buildReport = async (dateFrom, dateTo) => {
  const calls = await prisma.call.findMany({
    where: {
      calledAt: { gte: dateFrom, lte: dateTo }
    },
    include: { user: { select: { id: true, name: true } } }
  });

  // Overall stats
  const total = calls.length;
  const closed = calls.filter(c => c.result === 'CLOSED').length;
  const missed = calls.filter(c => c.result === 'NO_ANSWER').length;
  const callback = calls.filter(c => c.result === 'CALLBACK').length;
  const pending = calls.filter(c => c.result === 'PENDING').length;
  const totalDur = calls.reduce((s, c) => s + (c.durationSeconds || 0), 0);
  const rate = total > 0 ? (closed / total * 100).toFixed(1) : '0.0';

  // Per-employee breakdown
  const empMap = {};
  calls.forEach(c => {
    const name = c.user?.name || 'Không rõ';
    if (!empMap[name]) empMap[name] = { total: 0, closed: 0, missed: 0, dur: 0, notes: [] };
    empMap[name].total++;
    if (c.result === 'CLOSED') empMap[name].closed++;
    if (c.result === 'NO_ANSWER') empMap[name].missed++;
    empMap[name].dur += c.durationSeconds || 0;
    if (c.notes) empMap[name].notes.push(c.notes);
  });

  return { total, closed, missed, callback, pending, totalDur, rate, empMap };
};

// ── Format Report Message ────────────────────────────────────────────────────
const formatReport = (label, period, data) => {
  const lines = [];

  lines.push(`📅 Kỳ báo cáo: ${period}`);
  lines.push('');
  lines.push(`📞 Tổng cuộc gọi: ${data.total}`);
  lines.push(`✅ Chốt thành công: ${data.closed}`);
  lines.push(`📵 Cuộc gọi nhỡ: ${data.missed}`);
  lines.push(`↩️ Gọi lại: ${data.callback}`);
  lines.push(`⏳ Chờ xử lý: ${data.pending}`);
  lines.push(`⏱ Tổng thời lượng: ${fmtDur(data.totalDur)}`);
  lines.push(`📈 Tỷ lệ chốt: ${data.rate}%`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('👥 THỐNG KÊ TỪNG NHÂN VIÊN');
  lines.push('');

  const empNames = Object.keys(data.empMap).sort();
  empNames.forEach(name => {
    const e = data.empMap[name];
    const eRate = e.total > 0 ? (e.closed / e.total * 100).toFixed(1) : '0.0';
    lines.push(`🧑‍💼 ${name}`);
    lines.push(`   📞 ${e.total} cuộc | ✅ ${e.closed} chốt | 📵 ${e.missed} nhỡ | 📈 ${eRate}%`);
    lines.push(`   ⏱ Thời lượng: ${fmtDur(e.dur)}`);
    if (e.notes.length > 0) {
      lines.push(`   📝 Ghi chú: ${e.notes.length} mục`);
      // Show max 3 recent notes
      e.notes.slice(-3).forEach(n => {
        const short = n.length > 60 ? n.substring(0, 60) + '...' : n;
        lines.push(`      • ${short}`);
      });
    }
    lines.push('');
  });

  if (empNames.length === 0) {
    lines.push('   Không có dữ liệu cuộc gọi.');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('🤖 Báo cáo tự động từ Call Manager');

  return { title: `📊 ${label}`, lines };
};

// ── Report Generators ────────────────────────────────────────────────────────
const sendDailyReport = async () => {
  const vnNow = getVNTime();
  // Yesterday's report
  const yesterday = new Date(vnNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateFrom = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const dateTo = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);

  const data = await buildReport(dateFrom, dateTo);
  const { title, lines } = formatReport(
    `Báo cáo ngày ${fmtDate(yesterday)}`,
    fmtDate(yesterday),
    data
  );
  return sendToLark(title, lines);
};

const sendWeeklyReport = async () => {
  const vnNow = getVNTime();
  // Last week (Mon-Sun)
  const lastSunday = new Date(vnNow);
  lastSunday.setDate(lastSunday.getDate() - 1); // Yesterday = Sunday
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastMonday.getDate() - 6);

  const dateFrom = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate());
  const dateTo = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 23, 59, 59, 999);

  const data = await buildReport(dateFrom, dateTo);
  const { title, lines } = formatReport(
    `Báo cáo tuần ${fmtDate(lastMonday)} - ${fmtDate(lastSunday)}`,
    `${fmtDate(lastMonday)} → ${fmtDate(lastSunday)}`,
    data
  );
  return sendToLark(title, lines);
};

const sendMonthlyReport = async () => {
  const vnNow = getVNTime();
  // Previous month
  const prevMonth = new Date(vnNow.getFullYear(), vnNow.getMonth() - 1, 1);
  const lastDay = new Date(vnNow.getFullYear(), vnNow.getMonth(), 0);

  const dateFrom = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
  const dateTo = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59, 999);

  const months = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const monthLabel = months[prevMonth.getMonth() + 1];

  const data = await buildReport(dateFrom, dateTo);
  const { title, lines } = formatReport(
    `Báo cáo ${monthLabel}/${prevMonth.getFullYear()}`,
    `${fmtDate(dateFrom)} → ${fmtDate(dateTo)}`,
    data
  );
  return sendToLark(title, lines);
};

// ── Manual trigger (for API endpoint) ────────────────────────────────────────
const sendTestReport = async (type = 'daily') => {
  if (type === 'weekly') return sendWeeklyReport();
  if (type === 'monthly') return sendMonthlyReport();
  return sendDailyReport();
};

// ── Scheduler ────────────────────────────────────────────────────────────────
const startLarkReporter = () => {
  if (!LARK_ENABLED) {
    console.log('[Lark Reporter] Disabled. Set LARK_REPORT_ENABLED=true to enable.');
    return;
  }
  if (!LARK_WEBHOOK_URL) {
    console.log('[Lark Reporter] No LARK_WEBHOOK_URL configured.');
    return;
  }

  console.log('[Lark Reporter] Started. Schedule: Daily 08:00, Weekly Mon 08:00, Monthly 1st 08:00 (UTC+7)');

  const check = async () => {
    try {
      const vnNow = getVNTime();
      const hour = vnNow.getUTCHours();
      const minute = vnNow.getUTCMinutes();
      const dayOfWeek = vnNow.getUTCDay(); // 0=Sun, 1=Mon
      const dayOfMonth = vnNow.getUTCDate();

      // Only trigger at 08:00 (check within first minute)
      if (hour === 8 && minute === 0) {
        // Monthly: 1st of month
        if (dayOfMonth === 1) {
          console.log('[Lark Reporter] Sending monthly report...');
          await sendMonthlyReport();
        }

        // Weekly: Monday
        if (dayOfWeek === 1) {
          console.log('[Lark Reporter] Sending weekly report...');
          await sendWeeklyReport();
        }

        // Daily: every day
        console.log('[Lark Reporter] Sending daily report...');
        await sendDailyReport();
      }
    } catch (err) {
      console.error('[Lark Reporter] Error:', err);
    }
  };

  // Check every minute
  setInterval(check, 60 * 1000);
  // Also check immediately on startup (useful for testing)
  setTimeout(check, 5000);
};

module.exports = { startLarkReporter, sendDailyReport, sendWeeklyReport, sendMonthlyReport, sendTestReport };

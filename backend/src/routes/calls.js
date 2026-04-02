const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../services/authMiddleware');
const { processSTT } = require('../services/sttProcessor');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Configure storage to preserve file extension (required by Whisper API)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Create call (manual upload)
router.post('/upload', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    console.log('[Upload] Received request:', req.body);
    console.log('[Upload] File:', req.file);

    const { customerPhone, direction, serviceType, result, calledAt, notes } = req.body;
    const file = req.file;

    if (!file) {
      console.error('[Upload] No file provided');
      return res.status(400).json({ message: 'No audio file uploaded' });
    }

    console.log('[Upload] Creating call record in DB...');
    const call = await prisma.call.create({
      data: {
        userId: req.user.userId,
        customerPhone,
        direction: direction || 'OUTBOUND',
        source: 'MANUAL',
        durationSeconds: 0,
        calledAt: new Date(calledAt),
        serviceType,
        result: result || 'PENDING',
        notes,
        audioUrl: file.path, 
        transcriptStatus: 'PENDING'
      }
    });
    console.log('[Upload] Call record created:', call.id);

    // Start STT processing in background
    processSTT(call.id, path.resolve(file.path));

    res.status(201).json(call);
  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Create call (manual log)
router.post('/manual', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    const { customerPhone, customerName, direction, serviceType, result, calledAt, durationSeconds, notes, assignedToId } = req.body;
    const file = req.file;

    const call = await prisma.call.create({
      data: {
        userId: assignedToId || req.user.userId,
        customerPhone,
        customerName,
        direction: direction || 'OUTBOUND',
        source: 'MANUAL',
        durationSeconds: parseInt(durationSeconds) || 0,
        calledAt: new Date(calledAt),
        serviceType,
        result: result || 'COMPLETED',
        notes,
        audioUrl: file ? file.path : null,
        transcriptStatus: file ? 'PENDING' : 'NOT_AVAILABLE'
      }
    });

    if (file) {
      console.log('[Manual Log] File uploaded, starting STT:', file.path);
      processSTT(call.id, path.resolve(file.path));
    }

    res.status(201).json(call);
  } catch (error) {
    console.error('[Manual Log] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// List calls
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 25, search, status, userId } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(req.user.role !== 'ADMIN' ? { userId: req.user.userId } : {}),
      ...(userId && req.user.role === 'ADMIN' ? { userId } : {}),
      ...(status ? { transcriptStatus: status } : {}),
      ...(search ? {
        OR: [
          { customerPhone: { contains: search } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { segments: { some: { text: { contains: search, mode: 'insensitive' } } } }
        ]
      } : {})
    };

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { calledAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.call.count({ where })
    ]);

    res.json({ calls, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get call detail
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const call = await prisma.call.findUnique({
      where: { id: req.params.id },
      include: { 
        segments: { orderBy: { startTime: 'asc' } },
        tags: true,
        user: { select: { name: true } }
      }
    });

    if (!call) return res.status(404).json({ message: 'Call not found' });
    if (req.user.role !== 'ADMIN' && call.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(call);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Update call (notes)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const call = await prisma.call.findUnique({ where: { id } });
    if (!call) return res.status(404).json({ message: 'Call not found' });
    
    if (req.user.role !== 'ADMIN' && call.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedCall = await prisma.call.update({
      where: { id },
      data: { notes }
    });

    res.json(updatedCall);
  } catch (error) {
    console.error('[Update Call] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Delete call (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only Admin can delete records' });
    }

    await prisma.call.delete({ where: { id } });
    res.json({ message: 'Call deleted successfully' });
  } catch (error) {
    console.error('[Delete Call] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Import CSV/Excel data
const csvUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.txt', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file CSV hoặc Excel'), false);
  }
});

router.post('/import-csv', authMiddleware, csvUpload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ Admin mới được import dữ liệu' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file CSV để tải lên' });
    }

    const content = req.file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());

    if (lines.length < 2) {
      return res.status(400).json({ message: 'File rỗng hoặc không có dữ liệu' });
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\"]/g, ''));
    const phoneIdx = header.findIndex(h => h.includes('sdt') || h.includes('sđt') || h.includes('phone') || h.includes('số') || h.includes('dien thoai') || h.includes('điện thoại'));
    const nameIdx = header.findIndex(h => h.includes('ten') || h.includes('tên') || h.includes('name') || h.includes('khách') || h.includes('khach'));
    const noteIdx = header.findIndex(h => h.includes('ghi') || h.includes('note') || h.includes('chu'));
    const resultIdx = header.findIndex(h => h.includes('ket qua') || h.includes('kết quả') || h.includes('result') || h.includes('trang thai') || h.includes('trạng thái'));

    if (phoneIdx === -1) {
      return res.status(400).json({ 
        message: 'Không tìm thấy cột SĐT. Cần có cột chứa: SĐT, Phone, Số điện thoại',
        headers: header 
      });
    }

    // Get default user (admin who uploads)
    const defaultUserId = req.user.userId;

    const results = { success: 0, skipped: 0, errors: [] };
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parse (handles quoted fields)
      const cols = lines[i].match(/("[^"]*"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
      const phone = cols[phoneIdx]?.replace(/[^0-9+]/g, '');

      if (!phone || phone.length < 8) {
        results.skipped++;
        continue;
      }

      const name = nameIdx >= 0 ? cols[nameIdx] : null;
      const note = noteIdx >= 0 ? cols[noteIdx] : null;
      let result = 'PENDING';
      if (resultIdx >= 0) {
        const rv = (cols[resultIdx] || '').toLowerCase();
        if (rv.includes('chốt') || rv.includes('closed') || rv.includes('thành công')) result = 'CLOSED';
        else if (rv.includes('nhỡ') || rv.includes('no_answer') || rv.includes('không nghe')) result = 'NO_ANSWER';
        else if (rv.includes('callback') || rv.includes('gọi lại')) result = 'CALLBACK';
      }

      data.push({
        userId: defaultUserId,
        customerPhone: phone,
        customerName: name || null,
        direction: 'OUTBOUND',
        source: 'MANUAL',
        durationSeconds: 0,
        calledAt: new Date(),
        result,
        notes: note || null,
        transcriptStatus: 'PENDING'
      });
    }

    // Bulk create
    if (data.length > 0) {
      const created = await prisma.call.createMany({ data });
      results.success = created.count;
    }

    res.json({
      message: `Import thành công ${results.success} khách hàng, bỏ qua ${results.skipped} dòng`,
      ...results
    });
  } catch (error) {
    console.error('[Import CSV] Error:', error);
    res.status(500).json({ message: 'Lỗi khi import: ' + error.message });
  }
});

module.exports = router;

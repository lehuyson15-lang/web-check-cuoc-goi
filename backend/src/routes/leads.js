const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../services/authMiddleware');
const { sanitizeInput } = require('../services/securityMiddleware');
const { auditLog } = require('../services/auditLogger');

const prisma = new PrismaClient();

// Get leads for a user (staff gets theirs, admin gets all)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let whereClause = {};
    if (req.user.role !== 'ADMIN') {
      whereClause.assignedToId = req.user.id;
    }
    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: { name: true, email: true }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });
    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Admin assigning a lead
router.post('/', authMiddleware, adminMiddleware, sanitizeInput, async (req, res) => {
  const { customerPhone, customerName, assignedToId, slaMinutes = 15 } = req.body;
  
  if (!customerPhone || !assignedToId) return res.status(400).json({ error: 'Missing fields' });

  const assignedAt = new Date();
  const slaDeadline = new Date(assignedAt.getTime() + slaMinutes * 60000);

  try {
    const newLead = await prisma.lead.create({
      data: {
        customerPhone,
        customerName,
        assignedToId,
        assignedAt,
        slaDeadline,
      }
    });
    res.json(newLead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// Update lead status (e.g. staff marks as CONTACTED)
router.patch('/:id/status', authMiddleware, sanitizeInput, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // e.g. "CONTACTED"

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { status }
    });
    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Admin deleting a lead
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.lead.delete({ where: { id } });
    
    await auditLog({
      userId: req.user.userId,
      action: 'DELETE',
      resource: 'Lead',
      resourceId: id,
      ipAddress: req.ip
    });

    res.json({ message: 'Lead deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, adminMiddleware } = require('../services/authMiddleware');

const prisma = new PrismaClient();

// Register
router.post('/register', async (req, res) => {
  try {
    const { 
      name, email, password, role, extensionVoip,
      gender, phoneNumber, department, status, joinDate, address, emergencyContact,
      targetCallsPerDay, targetConversionsPerDay 
    } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        extensionVoip,
        gender,
        phoneNumber,
        department,
        status: status || 'pending',
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        address,
        emergencyContact,
        targetCallsPerDay: parseInt(targetCallsPerDay) || 50,
        targetConversionsPerDay: parseInt(targetConversionsPerDay) || 5
      }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('[Register] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Tài khoản của bạn đang chờ Admin duyệt' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Update user status (Admin only)
router.patch('/users/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { status }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;

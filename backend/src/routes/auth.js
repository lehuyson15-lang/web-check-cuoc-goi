const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../services/authMiddleware');
const { loginLimiter } = require('../services/securityMiddleware');
const { auditLog, loginAttemptLog } = require('../services/auditLogger');

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Register - Admin Only
router.post('/register', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { 
      name, email, password, role, extensionVoip,
      gender, phoneNumber, department, status, joinDate, address, emergencyContact,
      targetCallsPerDay, targetConversionsPerDay 
    } = req.body;
    
    // Validate strong password
    if (!password || password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, and numbers' });
    }

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

    // Do NOT generate a token since Admin is creating the user
    // Send back user without password
    const { password: _, ...userWithoutPassword } = user;
    
    await auditLog({
      userId: req.user.userId,
      action: 'CREATE',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { createdEmail: email, role }
    });

    res.status(201).json({ user: userWithoutPassword, message: 'User created successfully' });
  } catch (error) {
    console.error('[Register] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await loginAttemptLog({ ipAddress: req.ip, email, success: false });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isLocked) {
      return res.status(403).json({ message: `Account is locked. Reason: ${user.lockReason || 'Security violation'}. Please contact Admin.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await loginAttemptLog({ ipAddress: req.ip, email, success: false });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Tài khoản của bạn đang chờ Admin duyệt' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: req.ip
      }
    });

    await loginAttemptLog({ ipAddress: req.ip, email, success: true });
    
    await auditLog({
      userId: user.id,
      action: 'LOGIN',
      resource: 'Auth',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

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

// Update Profile
router.put('/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { name, phoneNumber, gender, email } = req.body;
    const userId = req.user.userId;
    
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email đã được sử dụng bởi người dùng khác' });
      }
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (phoneNumber) dataToUpdate.phoneNumber = phoneNumber;
    if (gender) dataToUpdate.gender = gender;
    if (email) dataToUpdate.email = email;
    if (req.file) dataToUpdate.avatar = req.file.path.replace(/\\/g, '/');

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'User Profile',
      resourceId: userId,
      ipAddress: req.ip,
      details: { updatedFields: Object.keys(dataToUpdate) }
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('[Update Profile] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Change Password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'User Password',
      resourceId: userId,
      ipAddress: req.ip
    });

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('[Change Password] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;

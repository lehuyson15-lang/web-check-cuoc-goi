const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and check status
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, status: true, isLocked: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists' });
    }
    
    if (user.isLocked) {
      return res.status(403).json({ message: 'Account is locked. Please contact Admin.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'User status is pending. Please contact Admin.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid or expired' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied, admin only' });
  }
};

const managerMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied, manager or admin only' });
  }
};

module.exports = { authMiddleware, adminMiddleware, managerMiddleware };


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auditLog = async ({ userId, action, resource, resourceId, ipAddress, userAgent, details }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource,
        resourceId: resourceId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        details: details ? JSON.stringify(details) : null
      }
    });
  } catch (error) {
    console.error('[Audit Logger] Error creating audit log:', error);
  }
};

const loginAttemptLog = async ({ ipAddress, email, success }) => {
  try {
    await prisma.loginAttempt.create({
      data: {
        ipAddress,
        email,
        success
      }
    });
  } catch (error) {
    console.error('[Audit Logger] Error logging login attempt:', error);
  }
};

module.exports = { auditLog, loginAttemptLog };

import prisma from '../config/prisma.js';

/**
 * Log sensitive activity to the immutable audit log table
 */
export const logAudit = async ({
  userId = null,
  userEmail = null,
  action,
  entityType,
  entityId = null,
  details = {},
  req = null,
}) => {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
      userAgent = req.headers['user-agent'] || null;
      if (!userId && req.user) {
        userId = req.user.id;
        userEmail = req.user.email;
      }
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: userId ? Number(userId) : null,
        userEmail,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details),
        ipAddress,
        userAgent,
      },
    });

    return log;
  } catch (error) {
    console.error('Audit Log Error (non-fatal):', error.message);
  }
};


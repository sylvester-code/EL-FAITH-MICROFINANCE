import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { ROLE_DEFAULT_PERMISSIONS, ROLES } from '../config/constants.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'elfaith_microfinance_super_secure_jwt_secret_wassa_powuako_2026_ghana');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        staffProfile: {
          include: { branch: true },
        },
        client: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact the Super Administrator.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account has been temporarily suspended. Contact management.' });
    }

    // Parse custom permissions if stored
    let customPerms = [];
    if (user.customPermissions) {
      try {
        customPerms = JSON.parse(user.customPermissions);
      } catch (e) {
        customPerms = [];
      }
    }

    // Merge default role permissions + custom perms
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
    const effectivePermissions = Array.from(new Set([...defaultPerms, ...customPerms]));

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      staffId: user.staffId,
      branchId: user.staffProfile?.branchId || user.client?.branchId || 1,
      staffProfile: user.staffProfile,
      client: user.client,
      permissions: effectivePermissions,
    };

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
  }
};

/**
 * Restrict to specific roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (req.user.role === ROLES.SUPER_ADMIN || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of roles: [${roles.join(', ')}].`,
    });
  };
};

/**
 * Restrict by specific permission
 */
export const requirePermission = (...requiredPerms) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Super Admin has full unrestricted access
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const hasAll = requiredPerms.every((perm) => req.user.permissions.includes(perm));
    if (hasAll) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. You lack the necessary permission: [${requiredPerms.join(', ')}].`,
    });
  };
};


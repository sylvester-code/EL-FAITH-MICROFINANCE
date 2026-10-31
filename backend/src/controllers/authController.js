import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';
import { ROLES, ROLE_DEFAULT_PERMISSIONS } from '../config/constants.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username/Email and password are required' });
    }

    const trimmedIdentifier = username.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedIdentifier },
          { username: trimmedIdentifier.toUpperCase() },
          { username: trimmedIdentifier.toLowerCase() },
          { email: trimmedIdentifier.toLowerCase() },
          { staffId: trimmedIdentifier.toUpperCase() },
        ],
      },
      include: {
        staffProfile: {
          include: { branch: true },
        },
        client: true,
      },
    });

    if (!user) {
      await logAudit({
        action: 'FAILED_LOGIN',
        entityType: 'User',
        details: { identifier: username, reason: 'User not found' },
        req,
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact Super Administrator.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account has been temporarily suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });

      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'FAILED_LOGIN_PASSWORD',
        entityType: 'User',
        entityId: user.id,
        details: { attempts: user.failedLoginAttempts + 1 },
        req,
      });

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset failed login attempts and update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    // Custom permissions merge
    let customPerms = [];
    if (user.customPermissions) {
      try {
        customPerms = JSON.parse(user.customPermissions);
      } catch (e) {
        customPerms = [];
      }
    }
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
    const effectivePermissions = Array.from(new Set([...defaultPerms, ...customPerms]));

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'elfaith_microfinance_super_secure_jwt_secret_wassa_powuako_2026_ghana',
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: { role: user.role },
      req,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        staffId: user.staffId,
        fullName: user.staffProfile?.fullName || user.client?.fullName || user.username,
        branch: user.staffProfile?.branch?.name || 'Wassa Powuako Branch',
        branchId: user.staffProfile?.branchId || user.client?.branchId || 1,
        clientId: user.client?.clientId || null,
        clientDbId: user.client?.id || null,
        permissions: effectivePermissions,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        staffProfile: {
          include: { branch: true },
        },
        client: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Unread notifications count
    const unreadNotifications = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        staffId: user.staffId,
        fullName: user.staffProfile?.fullName || user.client?.fullName || user.username,
        branch: user.staffProfile?.branch?.name || 'Wassa Powuako Branch',
        branchId: user.staffProfile?.branchId || user.client?.branchId || 1,
        clientId: user.client?.clientId || null,
        clientDbId: user.client?.id || null,
        permissions: req.user.permissions,
        unreadNotifications,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
      req,
    });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Initial Setup endpoint: creates first Super Administrator if no users exist
 */
export const setupInitialSuperAdmin = async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'System initialization already completed. Super Administrator exists.',
      });
    }

    const { username, email, password, fullName, phone } = req.body;
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Ensure default branch exists
    let mainBranch = await prisma.branch.findFirst({ where: { isMainBranch: true } });
    if (!mainBranch) {
      mainBranch = await prisma.branch.create({
        data: {
          name: 'EL-FAITH Main Branch',
          code: 'EF-WP-01',
          address: 'Main Commercial Street',
          town: 'Wassa Powuako',
          region: 'Western Region',
          phone: phone || '+233 24 556 7890',
          email: email,
          isMainBranch: true,
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const superAdmin = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        staffId: 'EF-ADM-001',
        isActive: true,
        staffProfile: {
          create: {
            fullName: fullName.trim(),
            phone: phone || '+233 24 556 7890',
            department: 'Executive Management',
            jobTitle: 'Super Administrator & Operations Director',
            branchId: mainBranch.id,
          },
        },
      },
    });

    await logAudit({
      userId: superAdmin.id,
      userEmail: superAdmin.email,
      action: 'INITIAL_SUPERADMIN_SETUP',
      entityType: 'User',
      entityId: superAdmin.id,
      details: { username: superAdmin.username },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Super Administrator initialized successfully. You may now log in.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


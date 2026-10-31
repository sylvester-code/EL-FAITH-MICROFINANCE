import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';
import { ROLES } from '../config/constants.js';

export const listStaff = async (req, res) => {
  try {
    const { role, branchId, search, status } = req.query;

    const where = {
      role: { not: ROLES.CLIENT },
    };

    if (role) where.role = role;
    if (branchId) where.staffProfile = { branchId: parseInt(branchId, 10) };
    if (status === 'active') {
      where.isActive = true;
      where.isSuspended = false;
    } else if (status === 'suspended') {
      where.isSuspended = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { staffId: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
        { staffProfile: { fullName: { contains: search } } },
      ];
    }

    const staffList = await prisma.user.findMany({
      where,
      include: {
        staffProfile: {
          include: { branch: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = staffList.map((u) => ({
      id: u.id,
      staffId: u.staffId,
      username: u.username,
      email: u.email,
      role: u.role,
      fullName: u.staffProfile?.fullName || u.username,
      phone: u.staffProfile?.phone,
      department: u.staffProfile?.department,
      jobTitle: u.staffProfile?.jobTitle,
      branchName: u.staffProfile?.branch?.name || 'Wassa Powuako Branch',
      branchId: u.staffProfile?.branchId,
      isActive: u.isActive,
      isSuspended: u.isSuspended,
      lastLoginAt: u.lastLoginAt,
      customPermissions: u.customPermissions ? JSON.parse(u.customPermissions) : [],
      createdAt: u.createdAt,
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createStaff = async (req, res) => {
  try {
    const {
      fullName,
      email,
      username,
      phone,
      altPhone,
      role,
      department,
      jobTitle,
      branchId,
      password,
      customPermissions,
    } = req.body;

    if (!fullName || !email || !username || !role || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Check unique username, email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username or email already in use' });
    }

    // Generate unique staff ID e.g. EF-ST-0012
    const totalStaff = await prisma.user.count({ where: { role: { not: ROLES.CLIENT } } });
    const staffId = `EF-ST-${String(totalStaff + 1).padStart(4, '0')}`;

    const passwordHash = await bcrypt.hash(password, 10);
    const branchToAssign = branchId ? parseInt(branchId, 10) : 1;

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        staffId,
        customPermissions: customPermissions ? JSON.stringify(customPermissions) : null,
        staffProfile: {
          create: {
            fullName: fullName.trim(),
            phone: phone || '',
            altPhone: altPhone || '',
            department: department || 'Operations',
            jobTitle: jobTitle || role.replace('_', ' '),
            branchId: branchToAssign,
          },
        },
      },
      include: {
        staffProfile: { include: { branch: true } },
      },
    });

    await logAudit({
      action: 'CREATE_STAFF',
      entityType: 'User',
      entityId: user.id,
      details: { staffId, fullName, role, branchId: branchToAssign },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Staff account ${staffId} created successfully`,
      data: {
        id: user.id,
        staffId: user.staffId,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.staffProfile?.fullName,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      phone,
      altPhone,
      role,
      department,
      jobTitle,
      branchId,
      customPermissions,
    } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      include: { staffProfile: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Update user record
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        role: role || targetUser.role,
        customPermissions: customPermissions ? JSON.stringify(customPermissions) : targetUser.customPermissions,
      },
    });

    // Update profile
    await prisma.staffProfile.upsert({
      where: { userId: targetUser.id },
      update: {
        fullName: fullName || targetUser.staffProfile?.fullName,
        phone: phone || targetUser.staffProfile?.phone,
        altPhone: altPhone !== undefined ? altPhone : targetUser.staffProfile?.altPhone,
        department: department || targetUser.staffProfile?.department,
        jobTitle: jobTitle || targetUser.staffProfile?.jobTitle,
        branchId: branchId ? parseInt(branchId, 10) : targetUser.staffProfile?.branchId,
      },
      create: {
        userId: targetUser.id,
        fullName: fullName || targetUser.username,
        phone: phone || '',
        department: department || 'Operations',
        jobTitle: jobTitle || 'Staff',
        branchId: branchId ? parseInt(branchId, 10) : 1,
      },
    });

    await logAudit({
      action: 'UPDATE_STAFF',
      entityType: 'User',
      entityId: targetUser.id,
      details: { role, department, jobTitle, customPermissions },
      req,
    });

    return res.json({ success: true, message: 'Staff account updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'activate', 'deactivate', 'suspend'

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id, 10) } });
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    let updateData = {};
    if (action === 'activate') {
      updateData = { isActive: true, isSuspended: false };
    } else if (action === 'deactivate') {
      updateData = { isActive: false };
    } else if (action === 'suspend') {
      updateData = { isSuspended: true };
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: updateData,
    });

    await logAudit({
      action: `STAFF_STATUS_${action.toUpperCase()}`,
      entityType: 'User',
      entityId: targetUser.id,
      details: { previousStatus: { isActive: targetUser.isActive, isSuspended: targetUser.isSuspended }, newStatus: updateData },
      req,
    });

    return res.json({ success: true, message: `Staff account status updated to ${action}`, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: parseInt(id, 10) },
      data: { passwordHash, failedLoginAttempts: 0 },
    });

    await logAudit({
      action: 'ADMIN_RESET_STAFF_PASSWORD',
      entityType: 'User',
      entityId: id,
      req,
    });

    return res.json({ success: true, message: 'Staff password has been reset successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = parseInt(id, 10);

    const clientsRegistered = await prisma.client.count({ where: { createdByUserId: staffId } });
    const applicationsSubmitted = await prisma.loanApplication.count({ where: { createdByUserId: staffId } });
    const loansDisbursed = await prisma.loanDisbursement.count({ where: { disbursedByUserId: staffId } });
    const repaymentsCollected = await prisma.repayment.count({ where: { receivingCashierId: staffId, isReversed: false } });
    const totalCollectionsResult = await prisma.repayment.aggregate({
      where: { receivingCashierId: staffId, isReversed: false },
      _sum: { amountPaid: true },
    });
    const followUpsLogged = await prisma.followUpActivity.count({ where: { officerId: staffId } });

    return res.json({
      success: true,
      data: {
        clientsRegistered,
        applicationsSubmitted,
        loansDisbursed,
        repaymentsCollected,
        totalCollectedAmount: totalCollectionsResult._sum.amountPaid || 0,
        followUpsLogged,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Administrator permanently deletes a staff member
 */
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staffUserId = parseInt(id, 10);

    const targetUser = await prisma.user.findUnique({
      where: { id: staffUserId },
      include: { staffProfile: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff account not found' });
    }

    if (targetUser.role === ROLES.SUPER_ADMIN || targetUser.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete the Super Administrator account.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink assigned clients and createdBy references
      await tx.client.updateMany({
        where: { assignedOfficerId: staffUserId },
        data: { assignedOfficerId: null },
      });
      await tx.client.updateMany({
        where: { createdByUserId: staffUserId },
        data: { createdByUserId: null },
      });

      // 2. Unlink loan application officer references
      await tx.loanApplication.updateMany({
        where: { assignedOfficerId: staffUserId },
        data: { assignedOfficerId: null },
      });

      // 3. Delete follow-up activities
      await tx.followUpActivity.deleteMany({
        where: { officerId: staffUserId },
      });

      // 4. Unlink client complaints
      await tx.clientComplaint.updateMany({
        where: { assignedToUserId: staffUserId },
        data: { assignedToUserId: null },
      });

      // 5. Delete application reviews
      await tx.loanApplicationReview.deleteMany({
        where: { reviewerId: staffUserId },
      });

      // 6. Delete staff profile
      await tx.staffProfile.deleteMany({
        where: { userId: staffUserId },
      });

      // 7. Delete notifications
      await tx.notification.deleteMany({
        where: { userId: staffUserId },
      });

      // 8. Delete user account
      await tx.user.delete({
        where: { id: staffUserId },
      });

      // 9. Log audit
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'DELETE_STAFF_ACCOUNT',
          entityType: 'User',
          entityId: String(staffUserId),
          details: JSON.stringify({
            deletedUsername: targetUser.username,
            deletedFullName: targetUser.staffProfile?.fullName,
            staffId: targetUser.staffId,
            role: targetUser.role,
          }),
        },
      });
    });

    return res.json({
      success: true,
      message: `Staff member ${targetUser.staffProfile?.fullName || targetUser.username} (${targetUser.staffId || ''}) has been permanently deleted.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


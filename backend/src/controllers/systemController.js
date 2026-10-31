import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';
import { COMPANY_DEFAULTS } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.resolve(__dirname, '../../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Get system and company settings
 */
export const getSystemSettings = async (req, res) => {
  try {
    const dbSettings = await prisma.systemSetting.findMany();
    const settingsMap = {};
    dbSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return res.json({
      success: true,
      data: {
        companyName: settingsMap.COMPANY_NAME || COMPANY_DEFAULTS.NAME,
        branch: settingsMap.COMPANY_BRANCH || COMPANY_DEFAULTS.BRANCH,
        address: settingsMap.COMPANY_ADDRESS || COMPANY_DEFAULTS.ADDRESS,
        region: settingsMap.COMPANY_REGION || COMPANY_DEFAULTS.REGION,
        phone: settingsMap.COMPANY_PHONE || COMPANY_DEFAULTS.PHONE,
        email: settingsMap.COMPANY_EMAIL || COMPANY_DEFAULTS.EMAIL,
        currency: settingsMap.COMPANY_CURRENCY || COMPANY_DEFAULTS.CURRENCY,
        currencySymbol: settingsMap.COMPANY_CURRENCY_SYMBOL || COMPANY_DEFAULTS.CURRENCY_SYMBOL,
        operatingHours: settingsMap.OPERATING_HOURS || COMPANY_DEFAULTS.HOURS,
        totalLoanAllocation: settingsMap.TOTAL_LOAN_ALLOCATION || '500000.00',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update system settings (Super Admin)
 */
export const updateSystemSettings = async (req, res) => {
  try {
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    await logAudit({
      action: 'UPDATE_SYSTEM_SETTINGS',
      entityType: 'SystemSetting',
      details: settings,
      req,
    });

    return res.json({ success: true, message: 'System settings updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Trigger secure database snapshot backup
 */
export const triggerBackup = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `elfaith-db-backup-${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);

    // Export complete snapshot of all relational tables
    const [
      branches,
      users,
      staffProfiles,
      clients,
      guarantors,
      loanProducts,
      loanApplications,
      loans,
      loanDisbursements,
      repaymentSchedules,
      repayments,
      cashAccounts,
      financialTransactions,
      expenses,
      auditLogs,
      systemSettings,
    ] = await Promise.all([
      prisma.branch.findMany(),
      prisma.user.findMany({ select: { id: true, username: true, email: true, role: true, staffId: true, isActive: true, createdAt: true } }),
      prisma.staffProfile.findMany(),
      prisma.client.findMany(),
      prisma.guarantor.findMany(),
      prisma.loanProduct.findMany(),
      prisma.loanApplication.findMany(),
      prisma.loan.findMany(),
      prisma.loanDisbursement.findMany(),
      prisma.repaymentSchedule.findMany(),
      prisma.repayment.findMany(),
      prisma.cashAccount.findMany(),
      prisma.financialTransaction.findMany(),
      prisma.expense.findMany(),
      prisma.auditLog.findMany({ take: 500, orderBy: { createdAt: 'desc' } }),
      prisma.systemSetting.findMany(),
    ]);

    const backupData = {
      system: 'EL-FAITH MICROFINANCE',
      branch: 'Wassa Powuako, Western Region, Ghana',
      timestamp: new Date().toISOString(),
      initiatedBy: req.user?.username || 'System',
      tables: {
        branches,
        users,
        staffProfiles,
        clients,
        guarantors,
        loanProducts,
        loanApplications,
        loans,
        loanDisbursements,
        repaymentSchedules,
        repayments,
        cashAccounts,
        financialTransactions,
        expenses,
        auditLogs,
        systemSettings,
      },
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
    const stats = fs.statSync(backupFilePath);

    await logAudit({
      action: 'DATABASE_BACKUP_GENERATED',
      entityType: 'Backup',
      details: { fileName: backupFileName, sizeBytes: stats.size },
      req,
    });

    return res.json({
      success: true,
      message: `Database backup snapshot ${backupFileName} generated successfully.`,
      data: {
        fileName: backupFileName,
        sizeKb: (stats.size / 1024).toFixed(2),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List backups
 */
export const listBackups = async (req, res) => {
  try {
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith('.json') || f.endsWith('.sql'))
      .map((fileName) => {
        const fullPath = path.join(backupDir, fileName);
        const stats = fs.statSync(fullPath);
        return {
          fileName,
          sizeKb: (stats.size / 1024).toFixed(2),
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, count: files.length, data: files });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Audit Logs with search & pagination
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { action, entityType, search, page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { userEmail: { contains: search } },
        { details: { contains: search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { username: true, staffProfile: { select: { fullName: true } } },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / take),
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Client Complaints & Support
 */
export const listComplaints = async (req, res) => {
  try {
    const { status, clientId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = parseInt(clientId, 10);

    const complaints = await prisma.clientComplaint.findMany({
      where,
      include: {
        client: { select: { clientId: true, fullName: true, phone: true } },
        assignedToUser: { select: { username: true, staffProfile: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createComplaint = async (req, res) => {
  try {
    const { clientId, subject, description, priority = 'MEDIUM' } = req.body;

    if (!clientId || !subject || !description) {
      return res.status(400).json({ success: false, message: 'Client ID, subject, and description are required' });
    }

    const complaint = await prisma.clientComplaint.create({
      data: {
        clientId: parseInt(clientId, 10),
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'OPEN',
      },
    });

    await logAudit({
      action: 'CREATE_CLIENT_COMPLAINT',
      entityType: 'ClientComplaint',
      entityId: complaint.id,
      details: { clientId, subject, priority },
      req,
    });

    return res.status(201).json({ success: true, message: 'Support ticket/complaint logged', data: complaint });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes, assignedToUserId } = req.body;

    const updated = await prisma.clientComplaint.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: status || undefined,
        resolutionNotes: resolutionNotes || undefined,
        assignedToUserId: assignedToUserId ? parseInt(assignedToUserId, 10) : undefined,
      },
    });

    return res.json({ success: true, message: 'Complaint status updated', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Administrator initiates 40-Day scheduled wipeout of the entire system
 */
export const scheduleSystemWipeout = async (req, res) => {
  try {
    const fortyDaysMs = 40 * 24 * 60 * 60 * 1000;
    const scheduledAt = new Date(Date.now() + fortyDaysMs);

    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { key: 'SYSTEM_WIPEOUT_STATUS' },
        update: { value: 'PENDING_40_DAYS' },
        create: { key: 'SYSTEM_WIPEOUT_STATUS', value: 'PENDING_40_DAYS', description: 'System Wipeout Status' },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'SYSTEM_WIPEOUT_SCHEDULED_AT' },
        update: { value: scheduledAt.toISOString() },
        create: { key: 'SYSTEM_WIPEOUT_SCHEDULED_AT', value: scheduledAt.toISOString(), description: 'Scheduled Wipeout Timestamp' },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'SYSTEM_WIPEOUT_INITIATED_AT' },
        update: { value: new Date().toISOString() },
        create: { key: 'SYSTEM_WIPEOUT_INITIATED_AT', value: new Date().toISOString(), description: 'Wipeout Initiation Timestamp' },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'SYSTEM_WIPEOUT_ALARM_ACTIVE' },
        update: { value: 'true' },
        create: { key: 'SYSTEM_WIPEOUT_ALARM_ACTIVE', value: 'true', description: 'Continuous Audio Siren Alarm Active' },
      }),
    ]);

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'INITIATE_SYSTEM_WIPEOUT_40_DAYS',
      entityType: 'System',
      details: { scheduledAt: scheduledAt.toISOString(), periodDays: 40 },
      req,
    });

    return res.json({
      success: true,
      message: 'CRITICAL: Entire system wipeout scheduled. 40-day grace period is running and continuous emergency alarm is sounding.',
      data: {
        status: 'PENDING_40_DAYS',
        scheduledAt: scheduledAt.toISOString(),
        alarmActive: true,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get current System Wipeout status and alarm state
 */
export const getSystemWipeoutStatus = async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'SYSTEM_WIPEOUT_STATUS',
            'SYSTEM_WIPEOUT_SCHEDULED_AT',
            'SYSTEM_WIPEOUT_INITIATED_AT',
            'SYSTEM_WIPEOUT_ALARM_ACTIVE',
          ],
        },
      },
    });

    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });

    const status = map.SYSTEM_WIPEOUT_STATUS || 'INACTIVE';
    const scheduledAt = map.SYSTEM_WIPEOUT_SCHEDULED_AT || null;
    const initiatedAt = map.SYSTEM_WIPEOUT_INITIATED_AT || null;
    const alarmActive = map.SYSTEM_WIPEOUT_ALARM_ACTIVE === 'true';

    let msRemaining = 0;
    if (status === 'PENDING_40_DAYS' && scheduledAt) {
      msRemaining = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
    }

    const totalSeconds = Math.floor(msRemaining / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return res.json({
      success: true,
      data: {
        status,
        isPending: status === 'PENDING_40_DAYS',
        scheduledAt,
        initiatedAt,
        alarmActive,
        msRemaining,
        canExecute: status === 'PENDING_40_DAYS' && msRemaining === 0,
        countdown: { days, hours, minutes, seconds },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Administrator silences continuous audio alarm
 */
export const stopWipeoutAlarm = async (req, res) => {
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'SYSTEM_WIPEOUT_ALARM_ACTIVE' },
      update: { value: 'false' },
      create: { key: 'SYSTEM_WIPEOUT_ALARM_ACTIVE', value: 'false' },
    });

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'SILENCE_WIPEOUT_ALARM',
      entityType: 'System',
      req,
    });

    return res.json({ success: true, message: 'Continuous emergency alarm silenced.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Administrator cancels the scheduled 40-day system wipeout
 */
export const cancelSystemWipeout = async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { key: 'SYSTEM_WIPEOUT_STATUS' },
        update: { value: 'INACTIVE' },
        create: { key: 'SYSTEM_WIPEOUT_STATUS', value: 'INACTIVE' },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'SYSTEM_WIPEOUT_SCHEDULED_AT' },
        update: { value: '' },
        create: { key: 'SYSTEM_WIPEOUT_SCHEDULED_AT', value: '' },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'SYSTEM_WIPEOUT_ALARM_ACTIVE' },
        update: { value: 'false' },
        create: { key: 'SYSTEM_WIPEOUT_ALARM_ACTIVE', value: 'false' },
      }),
    ]);

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CANCEL_SYSTEM_WIPEOUT',
      entityType: 'System',
      req,
    });

    return res.json({
      success: true,
      message: 'System wipeout was successfully aborted. The emergency alarm has been stopped and normal operations continue.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Execute final system wipeout once 40 days have elapsed
 */
export const executeSystemWipeout = async (req, res) => {
  try {
    const statusSetting = await prisma.systemSetting.findUnique({ where: { key: 'SYSTEM_WIPEOUT_STATUS' } });
    const schedSetting = await prisma.systemSetting.findUnique({ where: { key: 'SYSTEM_WIPEOUT_SCHEDULED_AT' } });

    if (!statusSetting || statusSetting.value !== 'PENDING_40_DAYS' || !schedSetting?.value) {
      return res.status(400).json({ success: false, message: 'No active scheduled wipeout found.' });
    }

    const scheduledTime = new Date(schedSetting.value).getTime();
    if (Date.now() < scheduledTime) {
      const remainingDays = Math.ceil((scheduledTime - Date.now()) / (1000 * 60 * 60 * 24));
      return res.status(400).json({
        success: false,
        message: `Cannot execute wipeout yet: The 40-day safety period has not completed. Deletion will only be allowed on or after ${new Date(scheduledTime).toLocaleString()} (${remainingDays} days remaining).`,
      });
    }

    // 40 days have passed: perform atomic wipeout, keeping only Super Admin
    const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });

    await prisma.$transaction(async (tx) => {
      await tx.transactionReversal.deleteMany({});
      await tx.repayment.deleteMany({});
      await tx.repaymentSchedule.deleteMany({});
      await tx.loanDisbursement.deleteMany({});
      await tx.loan.deleteMany({});
      await tx.loanApplicationReview.deleteMany({});
      await tx.loanApplication.deleteMany({});
      await tx.followUpActivity.deleteMany({});
      await tx.clientComplaint.deleteMany({});
      await tx.guarantor.deleteMany({});
      await tx.financialTransaction.deleteMany({});
      await tx.expense.deleteMany({});
      await tx.client.deleteMany({});
      await tx.notification.deleteMany({});
      if (superAdmin) {
        await tx.staffProfile.deleteMany({ where: { userId: { not: superAdmin.id } } });
        await tx.user.deleteMany({ where: { id: { not: superAdmin.id } } });
      }
      await tx.cashAccount.updateMany({ data: { currentBalance: 0.00 } });
      await tx.systemSetting.updateMany({
        where: { key: { in: ['SYSTEM_WIPEOUT_STATUS', 'SYSTEM_WIPEOUT_SCHEDULED_AT', 'SYSTEM_WIPEOUT_ALARM_ACTIVE'] } },
        data: { value: 'INACTIVE' },
      });
    });

    return res.json({
      success: true,
      message: 'System wipeout executed. All operational records have been permanently cleared after completing the 40-day period.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


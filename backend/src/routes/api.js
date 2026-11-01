import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

import * as authCtrl from '../controllers/authController.js';
import * as staffCtrl from '../controllers/staffController.js';
import * as clientCtrl from '../controllers/clientController.js';
import * as productCtrl from '../controllers/loanProductController.js';
import * as loanCtrl from '../controllers/loanController.js';
import * as repCtrl from '../controllers/repaymentController.js';
import * as recCtrl from '../controllers/recoveryController.js';
import * as accCtrl from '../controllers/accountingController.js';
import * as rptCtrl from '../controllers/reportController.js';
import * as sysCtrl from '../controllers/systemController.js';

const router = express.Router();

// ================= AUTH ROUTES =================
router.post('/auth/login', authCtrl.login);
router.post('/auth/setup-superadmin', authCtrl.setupInitialSuperAdmin);
router.get('/auth/me', authenticateToken, authCtrl.getMe);
router.post('/auth/change-password', authenticateToken, authCtrl.changePassword);

// ================= PUBLIC / SYSTEM SETTINGS =================
router.get('/system/settings', sysCtrl.getSystemSettings);
router.post('/system/settings', authenticateToken, requireRole(ROLES.SUPER_ADMIN), sysCtrl.updateSystemSettings);
router.post('/system/backup', authenticateToken, requireRole(ROLES.SUPER_ADMIN), sysCtrl.triggerBackup);
router.get('/system/backups', authenticateToken, requireRole(ROLES.SUPER_ADMIN), sysCtrl.listBackups);
router.get('/system/audit-logs', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.AUDITOR), sysCtrl.getAuditLogs);

// Complaints
router.get('/system/complaints', authenticateToken, sysCtrl.listComplaints);
router.post('/system/complaints', sysCtrl.createComplaint);
router.patch('/system/complaints/:id', authenticateToken, sysCtrl.updateComplaintStatus);

// 40-Day System Wipeout & Emergency Alarm
router.get('/system/wipeout/status', authenticateToken, sysCtrl.getSystemWipeoutStatus);
router.post('/system/wipeout/schedule', authenticateToken, requireRole(ROLES.SUPER_ADMIN), sysCtrl.scheduleSystemWipeout);
router.post('/system/wipeout/stop-alarm', authenticateToken, requireRole(ROLES.SUPER_ADMIN), sysCtrl.stopWipeoutAlarm);
router.post('/system/wipeout/cancel', authenticateToken, requireRole(ROLES.SUPER_ADMIN), sysCtrl.cancelSystemWipeout);
router.post('/system/wipeout/execute', authenticateToken, requireRole(ROLES.SUPER_ADMIN), sysCtrl.executeSystemWipeout);

// ================= STAFF MANAGEMENT (Super Admin & Managers) =================
router.get('/staff', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.AUDITOR), staffCtrl.listStaff);
router.post('/staff', authenticateToken, requireRole(ROLES.SUPER_ADMIN), staffCtrl.createStaff);
router.put('/staff/:id', authenticateToken, requireRole(ROLES.SUPER_ADMIN), staffCtrl.updateStaff);
router.patch('/staff/:id/status', authenticateToken, requireRole(ROLES.SUPER_ADMIN), staffCtrl.toggleStaffStatus);
router.post('/staff/:id/reset-password', authenticateToken, requireRole(ROLES.SUPER_ADMIN), staffCtrl.resetStaffPassword);
router.delete('/staff/:id', authenticateToken, requireRole(ROLES.SUPER_ADMIN), staffCtrl.deleteStaff);
router.get('/staff/:id/performance', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), staffCtrl.getStaffPerformance);

// ================= CLIENT MANAGEMENT =================
router.get('/clients', authenticateToken, clientCtrl.listClients);
router.post('/clients', authenticateToken, clientCtrl.registerClient);
router.get('/clients/:id', authenticateToken, clientCtrl.getClientProfile);
router.put('/clients/:id', authenticateToken, clientCtrl.updateClient);
router.delete('/clients/:id', authenticateToken, requireRole(ROLES.SUPER_ADMIN), clientCtrl.deleteClient);
router.post('/clients/:id/guarantors', authenticateToken, clientCtrl.addGuarantor);

// ================= LOAN PRODUCTS =================
router.get('/products', productCtrl.listProducts);
router.post('/products', authenticateToken, requireRole(ROLES.SUPER_ADMIN), productCtrl.createProduct);
router.put('/products/:id', authenticateToken, requireRole(ROLES.SUPER_ADMIN), productCtrl.updateProduct);

// ================= LOANS & APPLICATIONS =================
router.get('/loans/applications', authenticateToken, loanCtrl.listApplications);
router.post('/loans/applications', authenticateToken, loanCtrl.submitApplication);
router.post('/loans/applications/:id/review', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.CEO), loanCtrl.reviewApplication);
router.post('/loans/preview-calc', authenticateToken, loanCtrl.previewCalculation);
router.post('/loans/disburse', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.CASHIER), loanCtrl.disburseLoan);
router.get('/loans', authenticateToken, loanCtrl.listLoans);
router.get('/loans/:id', authenticateToken, loanCtrl.getLoanDetails);
router.get('/loans/:id/clearance', authenticateToken, loanCtrl.getClearanceCertificate);

// ================= REPAYMENTS & COLLECTIONS =================
router.get('/repayments', authenticateToken, repCtrl.listRepayments);
router.post('/repayments', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.CEO, ROLES.BRANCH_MANAGER, ROLES.CASHIER, ROLES.LOAN_OFFICER, ROLES.ACCOUNTANT, ROLES.CUSTOMER_SERVICE), repCtrl.recordRepayment);
router.post('/repayments/request-reversal', authenticateToken, repCtrl.requestReversal);
router.post('/repayments/approve-reversal', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.ACCOUNTANT), repCtrl.approveReversal);

// ================= RECOVERY & MONITORING =================
router.get('/recovery/overdue', authenticateToken, recCtrl.getOverdueLoans);
router.post('/recovery/follow-up', authenticateToken, recCtrl.logFollowUp);
router.get('/recovery/follow-ups', authenticateToken, recCtrl.getFollowUps);

// ================= ACCOUNTING & CASHBOOK =================
router.get('/accounting/cashbook', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.ACCOUNTANT, ROLES.AUDITOR, ROLES.CASHIER), accCtrl.getCashbook);
router.get('/accounting/accounts', authenticateToken, accCtrl.listCashAccounts);
router.post('/accounting/accounts', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT), accCtrl.createCashAccount);
router.get('/accounting/expenses', authenticateToken, accCtrl.listExpenses);
router.post('/accounting/expenses', authenticateToken, accCtrl.submitExpense);
router.post('/accounting/expenses/:id/approve', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.ACCOUNTANT), accCtrl.approveExpense);

// ================= REPORTS & ANALYTICS =================
router.get('/reports/dashboard-summary', authenticateToken, rptCtrl.getDashboardSummary);
router.post('/reports/loan-allocation', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.CEO), rptCtrl.updateLoanAllocation);
router.get('/reports/export/:reportType', authenticateToken, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.ACCOUNTANT, ROLES.AUDITOR), rptCtrl.exportReportCsv);

export default router;


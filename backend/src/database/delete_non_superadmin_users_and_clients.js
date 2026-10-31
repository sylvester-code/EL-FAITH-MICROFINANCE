import prisma from '../config/prisma.js';

async function cleanup() {
  console.log('=== CLEANUP NON-SUPERADMIN USERS AND CLIENTS ===');

  // 1. Locate the Super Administrator
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!superAdmin) {
    console.error('No Super Administrator found! Aborting to prevent accidental total lockout.');
    return;
  }

  console.log(`Identified Super Administrator: ${superAdmin.username} (ID: ${superAdmin.id}, Role: ${superAdmin.role})`);

  // 2. Identify clients NOT registered by the Super Admin
  const clientsToDelete = await prisma.client.findMany({
    where: {
      OR: [
        { createdByUserId: null },
        { createdByUserId: { not: superAdmin.id } },
      ],
    },
    select: { id: true, clientId: true, fullName: true, createdByUserId: true },
  });

  const clientIdsToDelete = clientsToDelete.map((c) => c.id);
  console.log(`Found ${clientsToDelete.length} client(s) not registered by Super Admin to delete:`);
  clientsToDelete.forEach((c) => console.log(`  - ${c.clientId}: ${c.fullName} (createdByUserId: ${c.createdByUserId})`));

  // 3. Identify users to delete (all users except the Super Admin)
  const usersToDelete = await prisma.user.findMany({
    where: {
      id: { not: superAdmin.id },
      role: { not: 'SUPER_ADMIN' },
    },
    select: { id: true, username: true, role: true },
  });

  const userIdsToDelete = usersToDelete.map((u) => u.id);
  console.log(`Found ${usersToDelete.length} user(s) to delete:`);
  usersToDelete.forEach((u) => console.log(`  - ${u.username} (${u.role}, ID: ${u.id})`));

  // 4. Clean up in reverse dependency order
  await prisma.$transaction(async (tx) => {
    // A. Reversals
    const reversalsDeleted = await tx.transactionReversal.deleteMany({});
    console.log(`Deleted ${reversalsDeleted.count} transaction reversals`);

    // B. Repayments
    const repaymentsDeleted = await tx.repayment.deleteMany({
      where: {
        OR: [
          { clientId: { in: clientIdsToDelete } },
          { receivingCashierId: { in: userIdsToDelete } },
        ],
      },
    });
    console.log(`Deleted ${repaymentsDeleted.count} repayments`);

    // C. Repayment schedules
    const schedulesDeleted = await tx.repaymentSchedule.deleteMany({
      where: {
        loan: {
          clientId: { in: clientIdsToDelete },
        },
      },
    });
    console.log(`Deleted ${schedulesDeleted.count} repayment schedules`);

    // D. Disbursements
    const disbDeleted = await tx.loanDisbursement.deleteMany({
      where: {
        OR: [
          { clientId: { in: clientIdsToDelete } },
          { disbursedByUserId: { in: userIdsToDelete } },
        ],
      },
    });
    console.log(`Deleted ${disbDeleted.count} loan disbursements`);

    // E. Loans
    const loansDeleted = await tx.loan.deleteMany({
      where: {
        clientId: { in: clientIdsToDelete },
      },
    });
    console.log(`Deleted ${loansDeleted.count} loans`);

    // F. Loan Application Reviews
    const reviewsDeleted = await tx.loanApplicationReview.deleteMany({
      where: {
        OR: [
          { reviewerId: { in: userIdsToDelete } },
          { application: { clientId: { in: clientIdsToDelete } } },
        ],
      },
    });
    console.log(`Deleted ${reviewsDeleted.count} loan application reviews`);

    // G. Loan Applications
    const appsDeleted = await tx.loanApplication.deleteMany({
      where: {
        OR: [
          { clientId: { in: clientIdsToDelete } },
          { createdByUserId: { in: userIdsToDelete } },
        ],
      },
    });
    console.log(`Deleted ${appsDeleted.count} loan applications`);

    // H. Follow-up Activities
    const followUpsDeleted = await tx.followUpActivity.deleteMany({
      where: {
        OR: [
          { clientId: { in: clientIdsToDelete } },
          { officerId: { in: userIdsToDelete } },
        ],
      },
    });
    console.log(`Deleted ${followUpsDeleted.count} follow-up activities`);

    // I. Client Complaints
    const complaintsDeleted = await tx.clientComplaint.deleteMany({
      where: {
        clientId: { in: clientIdsToDelete },
      },
    });
    console.log(`Deleted ${complaintsDeleted.count} client complaints`);

    // J. Guarantors
    const guarantorsDeleted = await tx.guarantor.deleteMany({
      where: {
        clientId: { in: clientIdsToDelete },
      },
    });
    console.log(`Deleted ${guarantorsDeleted.count} guarantors`);

    // K. Financial Transactions
    const finTxnsDeleted = await tx.financialTransaction.deleteMany({
      where: {
        OR: [
          { performedByUserId: { in: userIdsToDelete } },
          { loanId: { not: null } },
          { repaymentId: { not: null } },
          { expenseId: { not: null } },
        ],
      },
    });
    console.log(`Deleted ${finTxnsDeleted.count} financial transactions`);

    // L. Expenses
    const expensesDeleted = await tx.expense.deleteMany({
      where: {
        submittedByUserId: { in: userIdsToDelete },
      },
    });
    console.log(`Deleted ${expensesDeleted.count} expenses`);

    // M. Delete Clients
    const clientsResult = await tx.client.deleteMany({
      where: {
        id: { in: clientIdsToDelete },
      },
    });
    console.log(`Deleted ${clientsResult.count} clients`);

    // N. Notifications for deleted users
    const notifsDeleted = await tx.notification.deleteMany({
      where: {
        userId: { in: userIdsToDelete },
      },
    });
    console.log(`Deleted ${notifsDeleted.count} notifications`);

    // O. Staff Profiles for deleted users
    const staffProfilesDeleted = await tx.staffProfile.deleteMany({
      where: {
        userId: { in: userIdsToDelete },
      },
    });
    console.log(`Deleted ${staffProfilesDeleted.count} staff profiles`);

    // P. Delete the Users
    const usersResult = await tx.user.deleteMany({
      where: {
        id: { in: userIdsToDelete },
      },
    });
    console.log(`Deleted ${usersResult.count} users`);

    // Q. Log audit action by Super Admin
    await tx.auditLog.create({
      data: {
        userId: superAdmin.id,
        userEmail: superAdmin.email,
        action: 'CLEANUP_NON_SUPERADMIN_DATA',
        entityType: 'System',
        details: JSON.stringify({
          deletedClientsCount: clientsResult.count,
          deletedUsersCount: usersResult.count,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  });

  console.log('=== CLEANUP COMPLETED SUCCESSFULLY ===');
}

cleanup()
  .catch((err) => {
    console.error('Cleanup failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


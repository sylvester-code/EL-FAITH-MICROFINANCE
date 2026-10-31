import prisma from '../config/prisma.js';

async function resetDisbursementsAndCollections() {
  console.log('=== CLEARING ALL EXISTING MONEY COLLECTED AND DISBURSED ===');

  await prisma.$transaction(async (tx) => {
    // 1. Delete all reversals
    const rev = await tx.transactionReversal.deleteMany({});
    console.log(`Deleted ${rev.count} transaction reversals`);

    // 2. Delete all repayments (money collected)
    const reps = await tx.repayment.deleteMany({});
    console.log(`Deleted ${reps.count} repayment records (money collected)`);

    // 3. Delete all repayment schedules
    const sched = await tx.repaymentSchedule.deleteMany({});
    console.log(`Deleted ${sched.count} repayment schedules`);

    // 4. Delete all loan disbursements (money disbursed)
    const disb = await tx.loanDisbursement.deleteMany({});
    console.log(`Deleted ${disb.count} loan disbursements (money sent/disbursed)`);

    // 5. Delete all loans
    const loans = await tx.loan.deleteMany({});
    console.log(`Deleted ${loans.count} active/disbursed loans`);

    // 6. Delete all loan application reviews
    const reviews = await tx.loanApplicationReview.deleteMany({});
    console.log(`Deleted ${reviews.count} loan reviews`);

    // 7. Delete all loan applications
    const apps = await tx.loanApplication.deleteMany({});
    console.log(`Deleted ${apps.count} loan applications`);

    // 8. Delete financial transactions related to loans, repayments, and disbursements
    const finTxns = await tx.financialTransaction.deleteMany({
      where: {
        OR: [
          { type: 'DISBURSEMENT' },
          { type: 'REPAYMENT' },
          { loanId: { not: null } },
          { repaymentId: { not: null } },
        ],
      },
    });
    console.log(`Deleted ${finTxns.count} loan & repayment financial ledger transactions`);

    // 9. Reset cash account balances to 0.00
    await tx.cashAccount.updateMany({
      data: {
        currentBalance: 0.00,
      },
    });
    console.log('Reset cash account balances to GH₵ 0.00');

    // 10. Log Super Admin cleanup audit
    const superAdmin = await tx.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (superAdmin) {
      await tx.auditLog.create({
        data: {
          userId: superAdmin.id,
          userEmail: superAdmin.email,
          action: 'RESET_COLLECTIONS_AND_DISBURSEMENTS',
          entityType: 'FinancialOperations',
          details: JSON.stringify({
            deletedLoans: loans.count,
            deletedDisbursements: disb.count,
            deletedRepayments: reps.count,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }
  });

  console.log('=== ALL EXISTING MONEY COLLECTED AND DISBURSED CLEARED SUCCESSFULLY ===');
}

resetDisbursementsAndCollections()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });


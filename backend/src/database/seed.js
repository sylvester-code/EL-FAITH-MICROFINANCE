import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { ROLES } from '../config/constants.js';

async function main() {
  console.log('--- SEEDING EL-FAITH MICROFINANCE DATABASE ---');

  // 1. Create or ensure Main Branch in Wassa Powuako
  let branch = await prisma.branch.findFirst({ where: { code: 'EF-WP-01' } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'EL-FAITH Main Branch',
        code: 'EF-WP-01',
        address: 'Main Commercial Road, Next to Powuako Central Mosque',
        town: 'Wassa Powuako',
        region: 'Western Region',
        phone: '+233 24 556 7890',
        email: 'branch.powuako@elfaithmicrofinance.com',
        isMainBranch: true,
      },
    });
    console.log('✓ Main Branch created in Wassa Powuako');
  }

  // 2. Default System Settings
  const defaultSettings = [
    { key: 'COMPANY_NAME', value: 'EL-FAITH MICROFINANCE' },
    { key: 'COMPANY_BRANCH', value: 'Wassa Powuako Branch' },
    { key: 'COMPANY_ADDRESS', value: 'Main Commercial Road, Wassa Powuako, Western Region, Ghana' },
    { key: 'COMPANY_REGION', value: 'Western Region, Ghana' },
    { key: 'COMPANY_PHONE', value: '+233 24 556 7890 / +233 50 123 4567' },
    { key: 'COMPANY_EMAIL', value: 'info@elfaithmicrofinance.com' },
    { key: 'COMPANY_CURRENCY', value: 'GHS' },
    { key: 'COMPANY_CURRENCY_SYMBOL', value: 'GH₵' },
    { key: 'OPERATING_HOURS', value: 'Monday – Friday: 8:00 AM – 5:00 PM | Saturday: 9:00 AM – 2:00 PM' },
    { key: 'FIXED_INTEREST_RATE', value: '10' },
    { key: 'TOTAL_LOAN_ALLOCATION', value: '500000.00' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log('✓ System Settings initialized');

  // 3. Cash Accounts
  const initialAccounts = [
    { name: 'Main Vault', type: 'VAULT', initialBalance: 500000.00, branchId: branch.id },
    { name: 'Cash Drawer 1 (Main Cashier)', type: 'CASH_DRAWER', initialBalance: 25000.00, branchId: branch.id },
    { name: 'MTN Mobile Money Float', type: 'MOMO_FLOAT', accountNumber: '0245567890', initialBalance: 75000.00, branchId: branch.id },
    { name: 'Telecel Cash Float', type: 'MOMO_FLOAT', accountNumber: '0501234567', initialBalance: 30000.00, branchId: branch.id },
    { name: 'GCB Bank Commercial Acc', type: 'BANK_ACCOUNT', accountNumber: '1092837465019', initialBalance: 250000.00, branchId: branch.id },
  ];

  for (const acc of initialAccounts) {
    const existing = await prisma.cashAccount.findFirst({ where: { name: acc.name } });
    if (!existing) {
      await prisma.cashAccount.create({
        data: {
          name: acc.name,
          type: acc.type,
          accountNumber: acc.accountNumber || null,
          currentBalance: acc.initialBalance,
          branchId: acc.branchId,
        },
      });
    }
  }
  console.log('✓ Cash Accounts & Vault initialized');

  // 4. Create Standard Loan Products with 10% Interest Rate
  const products = [
    {
      code: 'BUS-01',
      name: 'Business Growth Loan',
      description: 'Working capital and stock expansion for local business owners, shopkeepers, and farmers in Wassa Powuako. Fixed 10% interest rate.',
      minAmount: 1000.00,
      maxAmount: 80000.00,
      interestMethod: 'FLAT_RATE',
      defaultInterestRate: 10.00,
      minInterestRate: 10.00,
      maxInterestRate: 10.00,
      minTermMonths: 3,
      maxTermMonths: 24,
      repaymentFrequency: 'MONTHLY',
      processingFeeRate: 2.50,
      insuranceFeeRate: 1.00,
    },
    {
      code: 'PER-01',
      name: 'Personal & Household Loan',
      description: 'Quick personal finance for family projects, school fees, and home improvements. Fixed 10% interest rate.',
      minAmount: 500.00,
      maxAmount: 20000.00,
      interestMethod: 'FLAT_RATE',
      defaultInterestRate: 10.00,
      minInterestRate: 10.00,
      maxInterestRate: 10.00,
      minTermMonths: 1,
      maxTermMonths: 12,
      repaymentFrequency: 'MONTHLY',
      processingFeeRate: 2.50,
      insuranceFeeRate: 1.00,
    },
    {
      code: 'EMG-01',
      name: 'Emergency Micro Loan',
      description: 'Fast disbursement within 24 hours for urgent medical, farming, or unforeseen domestic emergencies. Fixed 10% interest rate.',
      minAmount: 300.00,
      maxAmount: 5000.00,
      interestMethod: 'FLAT_RATE',
      defaultInterestRate: 10.00,
      minInterestRate: 10.00,
      maxInterestRate: 10.00,
      minTermMonths: 1,
      maxTermMonths: 4,
      repaymentFrequency: 'WEEKLY',
      processingFeeRate: 1.50,
      insuranceFeeRate: 0.50,
    },
    {
      code: 'SAL-01',
      name: 'Salary Advance Loan',
      description: 'Credit facility for government and private sector salaried workers. Fixed 10% interest rate.',
      minAmount: 1000.00,
      maxAmount: 30000.00,
      interestMethod: 'REDUCING_BALANCE',
      defaultInterestRate: 10.00,
      minInterestRate: 10.00,
      maxInterestRate: 10.00,
      minTermMonths: 2,
      maxTermMonths: 18,
      repaymentFrequency: 'MONTHLY',
      processingFeeRate: 2.00,
      insuranceFeeRate: 1.00,
    },
    {
      code: 'GRP-01',
      name: 'Susu Group Microfinance',
      description: 'Joint-liability group facility for market associations and farmer cooperatives. Fixed 10% interest rate.',
      minAmount: 500.00,
      maxAmount: 15000.00,
      interestMethod: 'FLAT_RATE',
      defaultInterestRate: 10.00,
      minInterestRate: 10.00,
      maxInterestRate: 10.00,
      minTermMonths: 1,
      maxTermMonths: 6,
      repaymentFrequency: 'WEEKLY',
      processingFeeRate: 2.00,
      insuranceFeeRate: 1.00,
    },
  ];

  for (const p of products) {
    await prisma.loanProduct.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }
  console.log('✓ Loan Products updated with fixed 10% interest rate');

  // 5. Seed / Update Super Administrator: ELIJAH APPIAH (Username: ELIJAH, Password: APPIAH)
  const passwordHash = await bcrypt.hash('APPIAH', 10);

  // Check if existing superadmin user exists or create
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { role: ROLES.SUPER_ADMIN },
        { username: 'ELIJAH' },
        { username: 'superadmin' },
      ],
    },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        username: 'ELIJAH',
        email: 'elijah.appiah@elfaith.com',
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        staffId: 'EF-ADM-001',
        isActive: true,
        staffProfile: {
          upsert: {
            create: {
              fullName: 'ELIJAH APPIAH',
              phone: '+233 24 556 7890',
              department: 'Executive Management',
              jobTitle: 'Super Administrator & Managing Director',
              branchId: branch.id,
            },
            update: {
              fullName: 'ELIJAH APPIAH',
              phone: '+233 24 556 7890',
              department: 'Executive Management',
              jobTitle: 'Super Administrator & Managing Director',
              branchId: branch.id,
            },
          },
        },
      },
    });
    console.log('✓ Super Administrator updated: ELIJAH (Name: ELIJAH APPIAH, Password: APPIAH)');
  } else {
    await prisma.user.create({
      data: {
        username: 'ELIJAH',
        email: 'elijah.appiah@elfaith.com',
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        staffId: 'EF-ADM-001',
        isActive: true,
        staffProfile: {
          create: {
            fullName: 'ELIJAH APPIAH',
            phone: '+233 24 556 7890',
            department: 'Executive Management',
            jobTitle: 'Super Administrator & Managing Director',
            branchId: branch.id,
          },
        },
      },
    });
    console.log('✓ Super Administrator created: ELIJAH (Name: ELIJAH APPIAH, Password: APPIAH)');
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

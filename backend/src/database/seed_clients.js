import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';

async function main() {
  const branch = await prisma.branch.findFirst();
  const branchId = branch ? branch.id : 1;

  // 1. Ensure Loan Officer Staff
  let officerUser = await prisma.user.findUnique({ where: { username: 'kofi_officer' } });
  if (!officerUser) {
    const passwordHash = await bcrypt.hash('staff123', 10);
    officerUser = await prisma.user.create({
      data: {
        username: 'kofi_officer',
        email: 'kofi@elfaithmicrofinance.com',
        passwordHash,
        role: ROLES.LOAN_OFFICER,
        staffProfile: {
          create: {
            fullName: 'Kofi Mensah',
            branchId,
            phone: '+233 24 333 4444',
            department: 'Credit & Field Operations',
            jobTitle: 'Loan Officer & Field Cashier',
          },
        },
      },
    });
    console.log('✓ Staff user kofi_officer created');
  }

  // 2. Ensure Clients
  const sampleClients = [
    {
      clientId: 'EF-CL-0001',
      fullName: 'Kwame Mensah',
      phone: '+233 24 555 1001',
      ghanaCardNumber: 'GHA-712345678-1',
      residentialAddress: 'House 42, Market Circle',
      communityTown: 'Wassa Powuako',
      occupation: 'Cocoa Farming & Wholesale Trading',
      nextOfKinName: 'Mary Mensah',
      nextOfKinPhone: '+233 24 555 9901',
      nextOfKinRelation: 'Spouse',
      assignedOfficerId: officerUser.id,
      branchId,
    },
    {
      clientId: 'EF-CL-0002',
      fullName: 'Akua Serwaa',
      phone: '+233 24 555 1002',
      ghanaCardNumber: 'GHA-823456789-2',
      residentialAddress: 'Market Square, Store 12',
      communityTown: 'Wassa Powuako',
      occupation: 'Provisions & Wholesale Foodstuffs',
      nextOfKinName: 'Kojo Serwaa',
      nextOfKinPhone: '+233 24 555 9902',
      nextOfKinRelation: 'Brother',
      assignedOfficerId: officerUser.id,
      branchId,
    },
    {
      clientId: 'EF-CL-0003',
      fullName: 'Kofi Boateng',
      phone: '+233 24 555 1003',
      ghanaCardNumber: 'GHA-934567890-3',
      residentialAddress: 'Opposite Presbyterian Church',
      communityTown: 'Wassa Powuako',
      occupation: 'Commercial Transport & Taxi Service',
      nextOfKinName: 'Grace Boateng',
      nextOfKinPhone: '+233 24 555 9903',
      nextOfKinRelation: 'Sister',
      assignedOfficerId: officerUser.id,
      branchId,
    },
    {
      clientId: 'EF-CL-0004',
      fullName: 'Gladys Bediako Acquah',
      phone: '+233 24 555 1004',
      ghanaCardNumber: 'GHA-145678901-4',
      residentialAddress: 'Near Chief Palace',
      communityTown: 'Wassa Powuako',
      occupation: 'Cassava & Plantain Processing',
      nextOfKinName: 'Emmanuel Acquah',
      nextOfKinPhone: '+233 24 555 9904',
      nextOfKinRelation: 'Son',
      assignedOfficerId: officerUser.id,
      branchId,
    },
  ];

  for (const c of sampleClients) {
    const exists = await prisma.client.findUnique({ where: { clientId: c.clientId } });
    if (!exists) {
      await prisma.client.create({ data: c });
      console.log(`✓ Client ${c.fullName} created`);
    }
  }

  // 3. Ensure Daily Microloan Product
  let product = await prisma.loanProduct.findFirst({ where: { repaymentFrequency: 'DAILY' } });
  if (!product) {
    product = await prisma.loanProduct.create({
      data: {
        code: 'DAILY-BIZ',
        name: 'Daily Business Capital Microloan',
        description: 'Daily repayment microloan facility for market traders and artisans in Wassa Powuako',
        minAmount: 500,
        maxAmount: 25000,
        defaultInterestRate: 3.5,
        minInterestRate: 2.0,
        maxInterestRate: 15.0,
        interestMethod: 'FLAT_RATE',
        repaymentFrequency: 'DAILY',
        processingFeeRate: 2.5,
        insuranceFeeRate: 1.0,
        isActive: true,
      },
    });
    console.log('✓ Daily loan product created');
  }

  console.log('Done!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// EL-FAITH MICROFINANCE - Interactive Cloud / Offline Fallback Data Engine
// Ensures 100% functionality on Vercel or when cloud backend is disconnected

const STORAGE_KEY = 'elfaith_cloud_store_v1';

const getInitialStore = () => ({
  clients: [
    {
      id: 'cli-001',
      clientId: 'EF-CL-0001',
      fullName: 'Kwame Mensah',
      phone: '+233 24 555 1001',
      idType: 'GHANA_CARD',
      idNumber: 'GHA-712345678-1',
      residenceAddress: 'House No. 42, Wassa Powuako Central',
      businessType: 'Cocoa Farming & Trading',
      monthlyIncome: 4500,
      status: 'ACTIVE',
      createdAt: '2026-10-15T08:30:00Z',
    },
    {
      id: 'cli-002',
      clientId: 'EF-CL-0002',
      fullName: 'Akua Serwaa',
      phone: '+233 24 555 1002',
      idType: 'GHANA_CARD',
      idNumber: 'GHA-823456789-2',
      residenceAddress: 'Market Circle Lane, Wassa Powuako',
      businessType: 'Provisions & Wholesale Store',
      monthlyIncome: 6200,
      status: 'ACTIVE',
      createdAt: '2026-10-18T10:15:00Z',
    },
    {
      id: 'cli-003',
      clientId: 'EF-CL-0003',
      fullName: 'Kofi Boateng',
      phone: '+233 24 555 1003',
      idType: 'GHANA_CARD',
      idNumber: 'GHA-934567890-3',
      residenceAddress: 'Opposite Presbyterian Church, Wassa Powuako',
      businessType: 'Transport & Taxi Service',
      monthlyIncome: 3800,
      status: 'ACTIVE',
      createdAt: '2026-10-20T11:45:00Z',
    },
    {
      id: 'cli-004',
      clientId: 'EF-CL-0004',
      fullName: 'Yaa Mansa',
      phone: '+233 24 555 1004',
      idType: 'GHANA_CARD',
      idNumber: 'GHA-145678901-4',
      residenceAddress: 'Near Chief Palace, Wassa Powuako',
      businessType: 'Cassava & Plantain Processing',
      monthlyIncome: 2900,
      status: 'ACTIVE',
      createdAt: '2026-10-22T09:00:00Z',
    },
  ],
  products: [
    {
      id: 'prod-001',
      code: 'DAILY-BIZ',
      name: 'Daily Business Capital Microloan',
      minAmount: 500,
      maxAmount: 25000,
      interestRatePerMonth: 3.5,
      repaymentFrequency: 'DAILY',
      isActive: true,
    },
  ],
  applications: [
    {
      id: 'app-001',
      applicationNumber: 'EF-APP-2026-0001',
      clientId: 'cli-003',
      client: {
        id: 'cli-003',
        fullName: 'Kofi Boateng',
        clientId: 'EF-CL-0003',
        phone: '+233 24 555 1003',
      },
      productId: 'prod-001',
      product: {
        id: 'prod-001',
        name: 'Daily Business Capital Microloan',
        interestMethod: 'FLAT_RATE',
        processingFeeRate: 2.5,
        insuranceFeeRate: 1.0,
      },
      requestedAmount: 6000,
      approvedAmount: 6000,
      proposedInterestRate: 3.5,
      repaymentPeriodMonths: 2,
      repaymentFrequency: 'DAILY',
      status: 'APPROVED',
      approvedAt: '2026-10-30T10:00:00Z',
    },
    {
      id: 'app-002',
      applicationNumber: 'EF-APP-2026-0002',
      clientId: 'cli-004',
      client: {
        id: 'cli-004',
        fullName: 'Yaa Mansa',
        clientId: 'EF-CL-0004',
        phone: '+233 24 555 1004',
      },
      productId: 'prod-001',
      product: {
        id: 'prod-001',
        name: 'Daily Business Capital Microloan',
        interestMethod: 'FLAT_RATE',
        processingFeeRate: 2.5,
        insuranceFeeRate: 1.0,
      },
      requestedAmount: 3500,
      approvedAmount: 3500,
      proposedInterestRate: 3.5,
      repaymentPeriodMonths: 1,
      repaymentFrequency: 'DAILY',
      status: 'APPROVED',
      approvedAt: '2026-10-31T09:30:00Z',
    },
  ],
  loans: [
    {
      id: 'loan-001',
      loanNumber: 'LN-2026-0001',
      clientId: 'cli-001',
      client: {
        id: 'cli-001',
        fullName: 'Kwame Mensah',
        clientId: 'EF-CL-0001',
        phone: '+233 24 555 1001',
      },
      principalAmount: 5000,
      totalInterest: 525,
      totalPayable: 5525,
      totalPaid: 1500,
      outstandingBalance: 4025,
      repaymentFrequency: 'DAILY',
      status: 'ACTIVE',
      disbursementDate: '2026-10-15',
      firstDueDate: '2026-10-22',
      createdAt: '2026-10-15T09:00:00Z',
    },
    {
      id: 'loan-002',
      loanNumber: 'LN-2026-0002',
      clientId: 'cli-002',
      client: {
        id: 'cli-002',
        fullName: 'Akua Serwaa',
        clientId: 'EF-CL-0002',
        phone: '+233 24 555 1002',
      },
      principalAmount: 8000,
      totalInterest: 840,
      totalPayable: 8840,
      totalPaid: 2200,
      outstandingBalance: 6640,
      repaymentFrequency: 'DAILY',
      status: 'ACTIVE',
      disbursementDate: '2026-10-18',
      firstDueDate: '2026-10-25',
      createdAt: '2026-10-18T11:00:00Z',
    },
  ],
  repayments: [
    {
      id: 'rep-001',
      receiptNumber: 'REC-2026-0001',
      loanId: 'loan-001',
      loan: {
        loanNumber: 'LN-2026-0001',
        client: { fullName: 'Kwame Mensah', clientId: 'EF-CL-0001', phone: '+233 24 555 1001' },
      },
      amountPaid: 500,
      principalPaid: 450,
      interestPaid: 50,
      paymentMethod: 'CASH',
      paymentChannel: 'FIELD_CASH',
      referenceNumber: 'TXN-0001',
      remainingBalance: 4025,
      collectedBy: 'kofi_officer',
      collectedByName: 'Kofi Mensah',
      paymentDate: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    },
    {
      id: 'rep-002',
      receiptNumber: 'REC-2026-0002',
      loanId: 'loan-002',
      loan: {
        loanNumber: 'LN-2026-0002',
        client: { fullName: 'Akua Serwaa', clientId: 'EF-CL-0002', phone: '+233 24 555 1002' },
      },
      amountPaid: 700,
      principalPaid: 630,
      interestPaid: 70,
      paymentMethod: 'MOBILE_MONEY',
      paymentChannel: 'MTN_MOMO',
      referenceNumber: 'TXN-0002',
      remainingBalance: 6640,
      collectedBy: 'kofi_officer',
      collectedByName: 'Kofi Mensah',
      paymentDate: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    },
  ],
  accounts: [
    { id: 'acc-001', code: '1010', name: 'Vault Cash - Wassa Powuako', type: 'ASSET', balance: 45000 },
    { id: 'acc-002', code: '1020', name: 'MTN Mobile Money Operational Wallet', type: 'ASSET', balance: 32000 },
  ],
});

export const loadStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading store:', e);
  }
  const initial = getInitialStore();
  saveStore(initial);
  return initial;
};

export const saveStore = (store) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed saving store:', e);
  }
};

export const handleMockRequest = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const url = endpoint.split('?')[0];
  const body = options.body ? JSON.parse(options.body) : {};
  const store = loadStore();

  // Authentication
  if (url === '/auth/login' && method === 'POST') {
    const { username, password } = body;
    const u = (username || '').trim().toUpperCase();
    const p = (password || '').trim();

    if (u === 'ELIJAH' && p === 'APPIAH') {
      const user = {
        id: 'usr-admin-001',
        fullName: 'ELIJAH APPIAH',
        username: 'ELIJAH',
        role: 'SUPER_ADMIN',
        roleTitle: 'Super Administrator / CEO',
        staffId: 'EF-ADM-001',
        email: 'appiah@elfaithmicrofinance.com',
        branch: { id: 'br-01', name: 'Wassa Powuako Branch' },
      };
      return { success: true, token: 'cloud-token-admin', user };
    }

    if (u === 'KOFI_OFFICER' && p === 'staff123') {
      const user = {
        id: 'usr-staff-001',
        fullName: 'Kofi Mensah',
        username: 'kofi_officer',
        role: 'STAFF',
        roleTitle: 'Loan Officer & Field Cashier',
        staffId: 'EF-ST-0001',
        email: 'kofi@elfaithmicrofinance.com',
        branch: { id: 'br-01', name: 'Wassa Powuako Branch' },
      };
      return { success: true, token: 'cloud-token-staff', user };
    }

    throw new Error('Invalid credentials. Please verify your username and password.');
  }

  if (url === '/auth/me') {
    const saved = localStorage.getItem('elfaith_user');
    if (saved) {
      return { success: true, user: JSON.parse(saved) };
    }
    return { success: false, message: 'Not logged in' };
  }

  // Dashboard summary
  if (url === '/reports/dashboard-summary') {
    const totalDisbursed = store.loans.reduce((acc, l) => acc + Number(l.principalAmount || 0), 0);
    const totalCollected = store.repayments.reduce((acc, r) => acc + Number(r.amountPaid || 0), 0);
    const activePortfolio = store.loans.reduce((acc, l) => acc + Number(l.outstandingBalance || 0), 0);
    return {
      success: true,
      data: {
        totalClients: store.clients.length,
        activeLoansCount: store.loans.length,
        totalDisbursed,
        totalCollected,
        activePortfolio,
        repaymentRate: 98.4,
        allocatedLoanFund: 150000,
        availableFund: 150000 - totalDisbursed,
        dailyFrequencyEnforced: true,
      },
    };
  }

  // Clients
  if (url === '/clients' && method === 'GET') {
    return { success: true, data: store.clients };
  }

  if (url.startsWith('/clients/') && method === 'GET') {
    const id = url.split('/clients/')[1];
    const client = store.clients.find((c) => c.id === id || c.clientId === id);
    if (!client) throw new Error('Client not found');
    const clientLoans = store.loans.filter((l) => l.clientId === client.id);
    return { success: true, data: { ...client, loans: clientLoans } };
  }

  if (url === '/clients' && method === 'POST') {
    const newClient = {
      id: `cli-${Date.now()}`,
      clientId: `EF-CL-000${store.clients.length + 1}`,
      fullName: body.fullName,
      phone: body.phone,
      idType: body.idType || 'GHANA_CARD',
      idNumber: body.idNumber || '',
      residenceAddress: body.residenceAddress || '',
      businessType: body.businessType || 'General Commerce',
      monthlyIncome: Number(body.monthlyIncome) || 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    store.clients.unshift(newClient);
    saveStore(store);
    return { success: true, client: newClient, message: 'Client registered successfully' };
  }

  if (url.startsWith('/clients/') && method === 'DELETE') {
    const id = url.split('/clients/')[1];
    store.clients = store.clients.filter((c) => c.id !== id && c.clientId !== id);
    store.loans = store.loans.filter((l) => l.clientId !== id);
    saveStore(store);
    return { success: true, message: 'Client and associated records deleted permanently' };
  }

  // Loans & Applications
  if (url === '/loans/applications' && method === 'GET') {
    const apps = store.applications || [];
    return { success: true, data: apps };
  }

  if (url === '/loans' && method === 'GET') {
    return { success: true, data: store.loans };
  }

  if (url === '/loans/preview-calc' && method === 'POST') {
    const p = Number(body.principal || 5000);
    const proc = Math.round(p * 0.025 * 100) / 100;
    const ins = Math.round(p * 0.01 * 100) / 100;
    const net = Math.round((p - proc - ins) * 100) / 100;
    const firstDue = body.firstRepaymentDate || new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: {
        principal: p,
        processingFee: proc,
        insuranceFee: ins,
        netDisbursement: net,
        firstDueDate: firstDue,
        repaymentFrequency: 'DAILY',
      },
    };
  }

  if (url === '/loans/disburse' && method === 'POST') {
    const apps = store.applications || [];
    const app = apps.find((a) => a.id === body.applicationId) || apps[0];
    const principal = app ? Number(app.approvedAmount || app.requestedAmount || 5000) : 5000;
    const termMonths = app ? Number(app.repaymentPeriodMonths || 1) : 1;
    const interest = Math.round(principal * 0.035 * termMonths * 100) / 100;
    const totalRepayable = principal + interest;

    // Repayment date: Starts from disbursement date OR set by Super Admin
    const firstRepaymentDate = body.firstRepaymentDate || new Date().toISOString().split('T')[0];

    const newLoan = {
      id: `loan-${Date.now()}`,
      loanNumber: `LN-${new Date().getFullYear()}-000${store.loans.length + 1}`,
      clientId: app ? app.clientId : 'cli-001',
      client: app ? app.client : { fullName: 'Valued Client', clientId: 'EF-CL' },
      principalAmount: principal,
      totalInterest: interest,
      totalPayable: totalRepayable,
      totalPaid: 0,
      outstandingBalance: totalRepayable,
      repaymentFrequency: 'DAILY',
      status: 'ACTIVE',
      disbursementDate: new Date().toISOString().split('T')[0],
      firstDueDate: firstRepaymentDate,
      createdAt: new Date().toISOString(),
    };

    store.loans.unshift(newLoan);
    store.applications = apps.filter((a) => a.id !== body.applicationId);
    saveStore(store);

    return {
      success: true,
      message: `Loan ${newLoan.loanNumber} successfully disbursed! Daily repayment schedule commences on ${firstRepaymentDate}.`,
      data: {
        loan: newLoan,
        disbursement: {
          id: `disb-${Date.now()}`,
          grossPrincipal: principal,
          netDisbursedAmount: principal * 0.965,
          firstRepaymentDate,
        },
        voucherUrl: null,
      },
    };
  }

  // Repayments
  if (url === '/repayments' && method === 'GET') {
    return { success: true, data: store.repayments };
  }

  if (url === '/repayments' && method === 'POST') {
    const loan = store.loans.find((l) => l.id === body.loanId);
    const amount = Number(body.amountPaid || body.amount || 0);
    const user = JSON.parse(localStorage.getItem('elfaith_user') || '{}');

    let remaining = loan ? Math.max(0, Number(loan.outstandingBalance || 0) - amount) : 0;
    if (loan) {
      loan.totalPaid = Number(loan.totalPaid || 0) + amount;
      loan.outstandingBalance = remaining;
    }

    const principalPaid = Math.round(amount * 0.9 * 100) / 100;
    const interestPaid = Math.round((amount - principalPaid) * 100) / 100;

    const newRep = {
      id: `rep-${Date.now()}`,
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      loanId: body.loanId,
      loan: loan
        ? {
            loanNumber: loan.loanNumber,
            client: loan.client,
          }
        : {
            loanNumber: 'LN-2026',
            client: { fullName: 'Walk-in Client', clientId: 'EF-CL' },
          },
      amountPaid: amount,
      principalPaid,
      interestPaid,
      paymentMethod: body.paymentMethod || 'CASH',
      paymentChannel: body.paymentChannel || 'FIELD_CASH',
      referenceNumber: body.referenceNumber || `REF-${Date.now()}`,
      remainingBalance: remaining,
      collectedBy: user.username || 'staff',
      collectedByName: user.fullName || 'Authorized Staff',
      paymentDate: new Date().toISOString(),
    };

    store.repayments.unshift(newRep);
    saveStore(store);
    return {
      success: true,
      repayment: newRep,
      receiptNumber: newRep.receiptNumber,
      remainingBalance: remaining,
      message: 'Repayment recorded successfully',
    };
  }

  // Accounting Accounts & Products
  if (url === '/accounting/accounts') {
    return { success: true, data: store.accounts };
  }

  if (url === '/products') {
    return { success: true, data: store.products };
  }

  // System
  if (url.includes('audit-logs')) {
    return { success: true, data: [] };
  }

  if (url.includes('wipeout-status')) {
    return { success: true, pendingWipeout: false };
  }

  // Default fallback response
  return { success: true, data: [] };
};


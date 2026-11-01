<?php
// EL-FAITH MICROFINANCE - SQLite In-Memory / Temp Cloud Schema & Seeder
// Enables full standalone PHP execution on Vercel without external MySQL requirement

function initSqliteDatabase(PDO $pdo) {
    // Register SQLite functions matching MySQL syntax
    $pdo->sqliteCreateFunction('NOW', function() { return date('Y-m-d H:i:s'); });
    $pdo->sqliteCreateFunction('CURDATE', function() { return date('Y-m-d'); });

    // 1. Create Tables
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS branch (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            town TEXT,
            createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT NOT NULL,
            staffId TEXT,
            status TEXT DEFAULT 'ACTIVE',
            branchId INTEGER,
            createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS client (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientId TEXT UNIQUE NOT NULL,
            fullName TEXT NOT NULL,
            phone TEXT NOT NULL,
            idType TEXT DEFAULT 'GHANA_CARD',
            idNumber TEXT,
            residenceAddress TEXT,
            businessType TEXT,
            monthlyIncome REAL DEFAULT 0,
            status TEXT DEFAULT 'ACTIVE',
            communityTown TEXT DEFAULT 'Wassa Powuako',
            branchId INTEGER DEFAULT 1,
            createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS loanproduct (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            minAmount REAL DEFAULT 500,
            maxAmount REAL DEFAULT 50000,
            defaultInterestRate REAL DEFAULT 3.5,
            interestMethod TEXT DEFAULT 'FLAT_RATE',
            repaymentFrequency TEXT DEFAULT 'DAILY',
            processingFeeRate REAL DEFAULT 2.5,
            insuranceFeeRate REAL DEFAULT 1.0,
            isActive INTEGER DEFAULT 1,
            createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS loanapplication (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            applicationNumber TEXT UNIQUE NOT NULL,
            clientId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            requestedAmount REAL NOT NULL,
            repaymentPeriodMonths INTEGER DEFAULT 2,
            repaymentFrequency TEXT DEFAULT 'DAILY',
            purpose TEXT,
            status TEXT DEFAULT 'APPROVED',
            approvedAmount REAL,
            notes TEXT,
            approvedByUserId INTEGER,
            approvedAt TEXT,
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS loan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loanAccountNumber TEXT UNIQUE NOT NULL,
            applicationId INTEGER,
            clientId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            branchId INTEGER DEFAULT 1,
            principalAmount REAL NOT NULL,
            approvedInterestRate REAL DEFAULT 3.5,
            interestMethod TEXT DEFAULT 'FLAT_RATE',
            repaymentFrequency TEXT DEFAULT 'DAILY',
            termMonths INTEGER DEFAULT 2,
            totalScheduledInterest REAL NOT NULL,
            totalFees REAL DEFAULT 0,
            totalScheduledRepayment REAL NOT NULL,
            totalPrincipalPaid REAL DEFAULT 0,
            totalInterestPaid REAL DEFAULT 0,
            totalFeesPaid REAL DEFAULT 0,
            totalPaid REAL DEFAULT 0,
            outstandingPrincipal REAL NOT NULL,
            outstandingInterest REAL NOT NULL,
            outstandingFees REAL DEFAULT 0,
            totalOutstanding REAL NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            disbursedAt TEXT,
            maturityDate TEXT,
            nextPaymentDate TEXT,
            nextAmountDue REAL,
            assignedOfficerId INTEGER DEFAULT 2,
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS loandisbursement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            disbursementReference TEXT UNIQUE NOT NULL,
            loanId INTEGER NOT NULL,
            clientId INTEGER NOT NULL,
            grossPrincipal REAL NOT NULL,
            processingFeeDeduction REAL DEFAULT 0,
            insuranceFeeDeduction REAL DEFAULT 0,
            otherDeductions REAL DEFAULT 0,
            netDisbursedAmount REAL NOT NULL,
            paymentMethod TEXT DEFAULT 'CASH',
            destinationAccount TEXT,
            preparedByUserId INTEGER,
            authorizedByUserId INTEGER,
            disbursedByUserId INTEGER,
            notes TEXT,
            disbursedAt TEXT,
            createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS repaymentschedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loanId INTEGER NOT NULL,
            installmentNumber INTEGER NOT NULL,
            dueDate TEXT NOT NULL,
            principalDue REAL NOT NULL,
            interestDue REAL NOT NULL,
            feesDue REAL DEFAULT 0,
            totalDue REAL NOT NULL,
            principalPaid REAL DEFAULT 0,
            interestPaid REAL DEFAULT 0,
            feesPaid REAL DEFAULT 0,
            totalPaid REAL DEFAULT 0,
            remainingBalance REAL NOT NULL,
            status TEXT DEFAULT 'UPCOMING',
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS repayment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receiptNumber TEXT UNIQUE NOT NULL,
            loanId INTEGER NOT NULL,
            clientId INTEGER NOT NULL,
            paymentReference TEXT,
            amountPaid REAL NOT NULL,
            paymentDate TEXT NOT NULL,
            paymentMethod TEXT DEFAULT 'CASH',
            transactionReference TEXT,
            principalComponent REAL NOT NULL,
            interestComponent REAL NOT NULL,
            feesComponent REAL DEFAULT 0,
            outstandingBalanceAfter REAL NOT NULL,
            receivingCashierId INTEGER NOT NULL,
            receiptPdfUrl TEXT,
            isReversed INTEGER DEFAULT 0,
            notes TEXT,
            createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS systemsetting (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updatedAt TEXT
        );
    ");

    // 2. Seed Default Settings
    $pdo->exec("
        INSERT OR IGNORE INTO systemsetting (key, value, updatedAt) VALUES ('TOTAL_LOAN_ALLOCATION', '150000.00', datetime('now'));
        INSERT OR IGNORE INTO systemsetting (key, value, updatedAt) VALUES ('WIPEOUT_STATUS', 'INACTIVE', datetime('now'));
    ");

    // 3. Seed Users: Super Admin (ELIJAH / APPIAH) & Staff (kofi_officer / staff123)
    $superAdminHash = password_hash('APPIAH', PASSWORD_BCRYPT);
    $staffHash = password_hash('staff123', PASSWORD_BCRYPT);

    $pdo->exec("
        INSERT OR IGNORE INTO user (id, username, passwordHash, role, staffId, status, branchId, createdAt)
        VALUES (1, 'ELIJAH', '{$superAdminHash}', 'SUPER_ADMIN', 'EF-ADM-001', 'ACTIVE', 1, datetime('now'));

        INSERT OR IGNORE INTO user (id, username, passwordHash, role, staffId, status, branchId, createdAt)
        VALUES (2, 'kofi_officer', '{$staffHash}', 'LOAN_OFFICER', 'EF-ST-0001', 'ACTIVE', 1, datetime('now'));
    ");

    // 4. Seed Products
    $pdo->exec("
        INSERT OR IGNORE INTO loanproduct (id, code, name, description, minAmount, maxAmount, defaultInterestRate, interestMethod, repaymentFrequency, processingFeeRate, insuranceFeeRate, isActive, createdAt)
        VALUES (1, 'DAILY-BIZ', 'Daily Business Growth Microloan', 'Daily repayment microfacility for market traders and artisans in Wassa Powuako', 500, 25000, 3.5, 'FLAT_RATE', 'DAILY', 2.5, 1.0, 1, datetime('now'));
    ");

    // 5. Seed Clients
    $pdo->exec("
        INSERT OR IGNORE INTO client (id, clientId, fullName, phone, idType, idNumber, residenceAddress, businessType, monthlyIncome, status, communityTown, branchId, createdAt)
        VALUES 
        (1, 'EF-CL-0001', 'Kwame Mensah', '+233 24 555 1001', 'GHANA_CARD', 'GHA-712345678-1', 'House 42, Market Circle', 'Cocoa Farming & Wholesale Trading', 4500, 'ACTIVE', 'Wassa Powuako', 1, datetime('now')),
        (2, 'EF-CL-0002', 'Akua Serwaa', '+233 24 555 1002', 'GHANA_CARD', 'GHA-823456789-2', 'Market Square, Store 12', 'Provisions & Wholesale Foodstuffs', 6200, 'ACTIVE', 'Wassa Powuako', 1, datetime('now')),
        (3, 'EF-CL-0003', 'Kofi Boateng', '+233 24 555 1003', 'GHANA_CARD', 'GHA-934567890-3', 'Opposite Presbyterian Church', 'Commercial Transport & Taxi Service', 3800, 'ACTIVE', 'Wassa Powuako', 1, datetime('now')),
        (4, 'EF-CL-0004', 'Gladys Bediako Acquah', '+233 24 555 1004', 'GHANA_CARD', 'GHA-145678901-4', 'Near Chief Palace', 'Cassava & Plantain Processing', 3100, 'ACTIVE', 'Wassa Powuako', 1, datetime('now'));
    ");

    // 6. Seed Active Loans & Repayments
    $today = date('Y-m-d');
    $pdo->exec("
        INSERT OR IGNORE INTO loan (
            id, loanAccountNumber, applicationId, clientId, productId, branchId,
            principalAmount, approvedInterestRate, interestMethod, repaymentFrequency,
            termMonths, totalScheduledInterest, totalFees, totalScheduledRepayment,
            totalPrincipalPaid, totalInterestPaid, totalFeesPaid, totalPaid,
            outstandingPrincipal, outstandingInterest, outstandingFees, totalOutstanding,
            status, disbursedAt, maturityDate, nextPaymentDate, nextAmountDue, assignedOfficerId, createdAt, updatedAt
        ) VALUES (
            1, 'LN-20261015-01A1', NULL, 1, 1, 1,
            5000.00, 3.50, 'FLAT_RATE', 'DAILY',
            2, 350.00, 0.00, 5350.00,
            450.00, 50.00, 0.00, 500.00,
            4550.00, 300.00, 0.00, 4850.00,
            'ACTIVE', datetime('now', '-10 days'), datetime('now', '+50 days'), '{$today}', 89.17, 2, datetime('now'), datetime('now')
        );

        INSERT OR IGNORE INTO repayment (
            id, receiptNumber, loanId, clientId, paymentReference,
            amountPaid, principalComponent, interestComponent, feesComponent,
            outstandingBalanceAfter, receivingCashierId, paymentMethod, transactionReference,
            paymentDate, isReversed, createdAt
        ) VALUES (
            1, 'REC-20261028-0001', 1, 1, 'REF-MOM-001',
            500.00, 450.00, 50.00, 0.00,
            4850.00, 2, 'CASH', 'CASH-001',
            datetime('now', '-2 hours'), 0, datetime('now')
        );
    ");

    // 7. Seed Pending Loan Awaiting Disbursement (Gladys Bediako Acquah)
    $pdo->exec("
        INSERT OR IGNORE INTO loan (
            id, loanAccountNumber, applicationId, clientId, productId, branchId,
            principalAmount, approvedInterestRate, interestMethod, repaymentFrequency,
            termMonths, totalScheduledInterest, totalFees, totalScheduledRepayment,
            totalPrincipalPaid, totalInterestPaid, totalFeesPaid, totalPaid,
            outstandingPrincipal, outstandingInterest, outstandingFees, totalOutstanding,
            status, disbursedAt, maturityDate, nextPaymentDate, nextAmountDue, assignedOfficerId, createdAt, updatedAt
        ) VALUES (
            4, 'LN-20261101-04E4', NULL, 4, 1, 1,
            2000.00, 3.50, 'FLAT_RATE', 'DAILY',
            6, 420.00, 0.00, 2420.00,
            0.00, 0.00, 0.00, 0.00,
            2000.00, 420.00, 0.00, 2420.00,
            'AWAITING_DISBURSEMENT', NULL, NULL, NULL, 13.44, 2, datetime('now'), datetime('now')
        );
    ");
}

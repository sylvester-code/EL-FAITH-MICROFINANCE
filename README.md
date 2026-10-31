# EL-FAITH MICROFINANCE — Integrated Loan Management & Financial Operations System

**Business Name:** EL-FAITH MICROFINANCE  
**Headquarters / Branch:** Wassa Powuako, Western Region, Ghana  
**Currency:** Ghanaian Cedi (`GHS` / `GH₵`)  
**Technology Stack:** React 18 (Vite, Tailwind CSS, Lucide Icons, Recharts), Node.js, Express.js, Prisma ORM, MySQL (XAMPP / MariaDB), Decimal.js, PDFKit  

---

## 🏛️ System Overview

**EL-FAITH MICROFINANCE** is a production-oriented, full-stack financial operations web application tailored specifically to the microcredit ecosystem of Ghana. The platform provides:
1. **Corporate Public Website:** Marketing hero, live loan calculator, product catalog, application steps, customer FAQs, contact form, and direct login entry points.
2. **Super Administrator Portal:** Complete system control, staff account creation, RBAC matrix, financial oversight, backup automation, and immutable audit logs.
3. **Role-Based Worker Portal:** Tailored dashboards and permission boundaries for Branch Managers, Loan Officers, Cashiers / Tellers, Accountants, Auditors, and Customer Service Officers.
4. **Client Self-Service Hub:** Borrowers can track approved loans, view real-time installment balances, download PDF repayment receipts, and retrieve official clearance certificates upon full repayment.

---

## 🚀 Live Services & Ports

- **Management Login Panel (Direct Entry):** [http://localhost:5173](http://localhost:5173)
- **Backend API (Express):** [http://localhost:5000](http://localhost:5000)
- **Health Check Endpoint:** [http://localhost:5000/health](http://localhost:5000/health)
- **Database:** MySQL on `127.0.0.1:3306` (`elfaith_microfinance`)

---

## 🔑 Super Administrator Credentials

- **Super Administrator Name:** ELIJAH APPIAH  
- **Username:** `ELIJAH`  
- **Password:** `APPIAH`  
- **Staff ID:** `EF-ADM-001`  
- **Role:** `SUPER_ADMIN`  
- **Interest Rate Policy:** Fixed **10%** on every loan facility  

### 🛡️ Portal Access Rules
1. **Direct Management Login:** The application opens directly to the management login panel at `http://localhost:5173/`. There is no public marketing website.
2. **Staff & Executive Access Only:** Only Super Admin ELIJAH APPIAH, the CEO, and authorized staff members can log in. There is no login panel for clients.
3. **Staff Credential Management:** Super Admin ELIJAH APPIAH creates staff accounts and assigns passwords to his workers from the **Staff Management** portal. Passwords can be reset at any time.

---

## 📐 Core Architecture & Modules

### 1. Decimal-Safe Financial Calculation Engine (`backend/src/services/financialEngine.js`)
- Uses `Decimal.js` for arbitrary-precision currency arithmetic (avoiding floating-point inaccuracies).
- **Flat Rate Method:** Monthly rate percentage applied to principal across the loan term.
- **Reducing Balance Method:** True equal installment amortization formula (`PMT`).
- **Repayment Waterfall:** Sequentially allocates funds to `Fees -> Interest -> Principal`.
- **Audit Protected Reversals:** Transactions cannot be deleted; authorized reversals recalculate schedules cleanly while preserving full audit history.

### 2. PDF Document Generation (`backend/src/services/pdfService.js`)
- Server-side PDF generation using `pdfkit`:
  - **Official Repayment Receipts:** Unique receipt number (`EF-REC-XXXX`), allocation breakdown, outstanding balance, cashier name, branded header.
  - **Disbursement Vouchers:** Gross principal, statutory deductions (2.5% processing fee, 1.0% credit insurance), net payout, sign-off lines.
  - **Loan Clearance Certificates:** Issued when loan status transitions to `FULLY_PAID`.

### 3. Role-Based Access Control (RBAC) (`backend/src/middleware/auth.js`)
- Strict server-side permission verification (`requireRole`, `requirePermission`).
- Workers cannot approve their own submitted loan applications (separation of duties).
- Auditors cannot mutate finalized transactions.
- Client borrowers only access their own KYC and financial records.

---

## 🛠️ Installation & Setup Guide

### Prerequisites
1. **Node.js** v20+ or v22+
2. **MySQL** 8.0+ or **XAMPP / MariaDB** running on `127.0.0.1:3306`

### Step 1: Database Setup
Ensure MySQL is running on port 3306. Create the database:
```sql
CREATE DATABASE elfaith_microfinance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Backend Configuration & Start
```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed     # Seeds Super Admin, Staff, Products, and Sample Clients
npm run test     # Runs financial calculation unit tests
npm start        # Starts server on http://localhost:5000
```

### Step 3: Frontend Configuration & Start
```powershell
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

---

## 🧪 Automated Testing

Unit tests for the financial calculation engine verify flat rate schedules, reducing balance schedules, weekly/monthly frequencies, partial/excess repayments, and reversals:
```powershell
cd backend
npm test
```
Result: `pass 5, fail 0`

---

## 📦 Database Backup & Recovery

- **Manual Trigger:** Super Administrator can click **"Trigger Backup"** in the **Settings & Backups** page.
- **Storage:** JSON snapshots are timestamped and preserved in `backend/backups/`.
- Full recovery instructions are documented in [docs/BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md).

---

## 📍 Business Location
**EL-FAITH MICROFINANCE**  
Main Commercial Road, Next to Powuako Central Mosque,  
Wassa Powuako, Western Region, Ghana  
Phone: +233 24 556 7890 / +233 50 123 4567  
Email: info@elfaithmicrofinance.com


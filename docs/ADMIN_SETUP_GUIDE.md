# Super Administrator Setup & Governance Guide
**EL-FAITH MICROFINANCE — Wassa Powuako, Western Region, Ghana**

## 1. Initial Setup Process
When the system is first deployed on a clean database without any accounts, access to administrative functions is locked. The initial Super Administrator must be established through the dedicated setup endpoint:
- **Endpoint:** `POST /api/auth/setup-superadmin`
- **Payload:**
  ```json
  {
    "username": "superadmin",
    "email": "admin@elfaith.com",
    "password": "StrongPassword2026!",
    "fullName": "Rev. Emmanuel Osei",
    "phone": "+233 24 556 7890"
  }
  ```
- Once the initial Super Administrator exists, this endpoint is permanently sealed to prevent unauthorized administrative escalation.

---

## 2. Separation of Duties Matrix

| Action | Allowed Roles | Prohibited Roles | Justification |
| :--- | :--- | :--- | :--- |
| **Loan Application Review** | Super Admin, Branch Manager | Loan Officer who created the application | Prevents conflict of interest |
| **Loan Disbursement Execution** | Cashier, Branch Manager, Super Admin | Customer Service, Client | Restricts cash handling to authorized tellers |
| **Repayment Recording** | Cashier, Branch Manager, Super Admin | Auditor, Customer Service | Enforces cashier float reconciliation |
| **Payment Reversal Authorization** | Super Admin, Branch Manager, Accountant | Submitting Cashier | Prevents fraudulent unmonitored reversals |
| **Financial Mutation** | Operational Staff | Auditor | Preserves internal audit independence |

---

## 3. Account Lifecycle Management
1. **Creation:** Generated automatically with format `EF-ST-XXXX`.
2. **Suspension:** Immediate lock on access while preserving transaction history and assigned clients.
3. **Password Reset:** Generates a secure hash using bcrypt (10 rounds).
4. **Audit Trail:** Every login attempt, failed credential entry, permission alteration, and password change is appended to `audit_logs`.


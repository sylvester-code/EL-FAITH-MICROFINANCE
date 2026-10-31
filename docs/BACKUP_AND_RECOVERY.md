# Database Backup and Disaster Recovery Documentation
**EL-FAITH MICROFINANCE — Wassa Powuako, Western Region, Ghana**

## 1. Overview
Financial institutions require strict data protection, resilience against hardware failure, and fast point-in-time recovery. The EL-FAITH MICROFINANCE system implements automated snapshot backups that capture the complete relational state of the microfinance institution.

---

## 2. Backup Methods

### A. System-Generated Snapshot (Recommended)
1. Navigate to the **Super Administrator Portal** -> **Settings & Backups** (`/portal/settings`).
2. Click **"Trigger Backup"**.
3. The system executes a high-speed JSON relational dump of all 16 tables:
   - `branches`, `users`, `staff_profiles`
   - `clients`, `guarantors`
   - `loan_products`, `loan_applications`, `loan_application_reviews`
   - `loans`, `loan_disbursements`, `repayment_schedules`, `repayments`
   - `cash_accounts`, `financial_transactions`, `expenses`
   - `audit_logs`, `system_settings`
4. Backups are stored in `backend/backups/elfaith-db-backup-<timestamp>.json`.

### B. Native MySQL mysqldump Utility
For production server automation (e.g. daily cron at 23:00):
```bash
mysqldump -u root -p elfaith_microfinance > /backups/elfaith_full_$(date +%F_%T).sql
```

---

## 3. Restoration Procedure

### Restoring from Native MySQL Dump:
1. Ensure the MySQL server is running on `127.0.0.1:3306`.
2. Re-create the empty database if lost:
   ```sql
   DROP DATABASE IF EXISTS elfaith_microfinance;
   CREATE DATABASE elfaith_microfinance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import the backup archive:
   ```bash
   mysql -u root -p elfaith_microfinance < /backups/elfaith_full_<timestamp>.sql
   ```
4. Restart the backend service.

---

## 4. Retention and Security Policy
- Retain daily backups for 30 days.
- Retain month-end snapshots for 7 years to meet Bank of Ghana regulatory audit standards.
- Store off-site copies on encrypted cloud storage.


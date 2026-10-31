<?php
// EL-FAITH MICROFINANCE - Loan Disbursements Desk
// Enforces Super Admin Allocation Ceiling & 1-Week (7 Days) Repayment Start Date
$activePage = 'disbursements';
$pageTitle = 'Loan Disbursements Desk';

require_once __DIR__ . '/includes/header.php';

$success = '';
$error = '';

// Handle Disbursement Submission (Restricted to Super Admin or authorized Staff)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['disburse_loan'])) {
    $loanId = intval($_POST['loan_id'] ?? 0);
    $paymentMethod = $_POST['payment_method'] ?? 'CASH';
    $destAccount = trim($_POST['destination_account'] ?? '');
    $notes = trim($_POST['notes'] ?? '');

    if ($loanId <= 0) {
        $error = 'Invalid loan selected for disbursement.';
    } else {
        // Fetch loan awaiting disbursement
        $stmt = $pdo->prepare("
            SELECT l.*, c.fullName AS clientName, c.phone AS clientPhone, c.clientId AS clientCode, c.communityTown, p.name AS productName
            FROM loan l
            JOIN client c ON l.clientId = c.id
            JOIN loanproduct p ON l.productId = p.id
            WHERE l.id = ? AND l.status IN ('APPROVED', 'AWAITING_DISBURSEMENT')
        ");
        $stmt->execute([$loanId]);
        $loan = $stmt->fetch();

        if (!$loan) {
            $error = 'Loan is not in an approved status ready for disbursement.';
        } else {
            $principal = floatval($loan['principalAmount']);

            // 1. Verify Super Admin Lending Capital Allocation Ceiling
            $allocStmt = $pdo->query("SELECT `value` FROM systemsetting WHERE `key` = 'TOTAL_LOAN_ALLOCATION'");
            $totalAllocation = floatval($allocStmt->fetchColumn() ?: 500000.00);

            $disbSumStmt = $pdo->query("SELECT COALESCE(SUM(principalAmount), 0) FROM loan WHERE status IN ('ACTIVE', 'DISBURSED', 'OVERDUE', 'FULLY_PAID')");
            $alreadyDisbursed = floatval($disbSumStmt->fetchColumn() ?: 0);

            if (($alreadyDisbursed + $principal) > $totalAllocation) {
                $error = "Disbursement blocked: Requested amount (" . formatCurrency($principal) . ") exceeds the remaining lending fund ceiling. Remaining available: " . formatCurrency(max(0, $totalAllocation - $alreadyDisbursed));
            } else {
                try {
                    $pdo->beginTransaction();

                    $disbDate = new DateTime();
                    
                    // Repayment Schedule starts exactly 1 WEEK (7 DAYS) after disbursement!
                    $firstInstallmentDate = (clone $disbDate)->modify('+7 days');

                    // Calculate maturity date based on term
                    $termMonths = intval($loan['termMonths']) ?: 6;
                    $maturityDate = (clone $disbDate)->modify("+{$termMonths} months");

                    // 1. Create Disbursement Record
                    $disbRef = 'DISB-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
                    $disbStmt = $pdo->prepare("
                        INSERT INTO loandisbursement (
                            disbursementReference, loanId, clientId, grossPrincipal,
                            processingFeeDeduction, insuranceFeeDeduction, otherDeductions,
                            netDisbursedAmount, paymentMethod, destinationAccount,
                            preparedByUserId, authorizedByUserId, disbursedByUserId,
                            notes, disbursedAt, createdAt
                        ) VALUES (
                            ?, ?, ?, ?,
                            0.00, 0.00, 0.00,
                            ?, ?, ?,
                            ?, ?, ?,
                            ?, NOW(3), NOW(3)
                        )
                    ");
                    $disbStmt->execute([
                        $disbRef,
                        $loan['id'],
                        $loan['clientId'],
                        $principal,
                        $principal,
                        $paymentMethod,
                        $destAccount ?: null,
                        $user['id'],
                        $user['id'],
                        $user['id'],
                        $notes ?: 'Disbursement completed. First repayment scheduled in 7 days.'
                    ]);

                    // 2. Generate Installment Schedule (Starting 1 week after disbursement)
                    $frequency = $loan['repaymentFrequency'] ?: 'WEEKLY';
                    $totalRepayable = floatval($loan['totalScheduledRepayment']);
                    $installmentCount = ($frequency === 'WEEKLY') ? max(1, $termMonths * 4) : max(1, $termMonths);
                    $installmentAmount = round($totalRepayable / $installmentCount, 2);

                    $scheduleDate = clone $firstInstallmentDate;
                    for ($i = 1; $i <= $installmentCount; $i++) {
                        $schStmt = $pdo->prepare("
                            INSERT INTO repaymentschedule (
                                loanId, installmentNumber, dueDate, scheduledPrincipal,
                                scheduledInterest, scheduledFees, totalDue, status, createdAt, updatedAt
                            ) VALUES (
                                ?, ?, ?, ?,
                                ?, 0.00, ?, 'PENDING', NOW(3), NOW(3)
                            )
                        ");
                        $schStmt->execute([
                            $loan['id'],
                            $i,
                            $scheduleDate->format('Y-m-d H:i:s'),
                            round($loan['principalAmount'] / $installmentCount, 2),
                            round($loan['totalScheduledInterest'] / $installmentCount, 2),
                            $installmentAmount
                        ]);

                        // Next schedule date
                        if ($frequency === 'WEEKLY') {
                            $scheduleDate->modify('+7 days');
                        } else {
                            $scheduleDate->modify('+1 month');
                        }
                    }

                    // 3. Update Loan to DISBURSED / ACTIVE
                    $updLoan = $pdo->prepare("
                        UPDATE loan SET 
                            status = 'ACTIVE',
                            disbursedAt = NOW(3),
                            maturityDate = ?,
                            nextPaymentDate = ?,
                            nextAmountDue = ?,
                            updatedAt = NOW(3)
                        WHERE id = ?
                    ");
                    $updLoan->execute([
                        $maturityDate->format('Y-m-d H:i:s'),
                        $firstInstallmentDate->format('Y-m-d H:i:s'),
                        $installmentAmount,
                        $loan['id']
                    ]);

                    $pdo->commit();
                    $success = "Loan for {$loan['clientName']} successfully disbursed (" . formatCurrency($principal) . ")! First repayment due on " . $firstInstallmentDate->format('d M Y') . " (1 week from today). Ref: {$disbRef}";
                } catch (Exception $e) {
                    $pdo->rollBack();
                    $error = "Disbursement error: " . $e->getMessage();
                }
            }
        }
    }
}

// Fetch Loans Awaiting Disbursement
$pendingLoansStmt = $pdo->query("
    SELECT l.*, c.fullName AS clientName, c.clientId AS clientCode, c.phone AS clientPhone, c.communityTown, p.name AS productName
    FROM loan l
    JOIN client c ON l.clientId = c.id
    JOIN loanproduct p ON l.productId = p.id
    WHERE l.status IN ('APPROVED', 'AWAITING_DISBURSEMENT')
    ORDER BY l.createdAt DESC
");
$pendingLoans = $pendingLoansStmt->fetchAll();

// Fetch Recent Disbursements
$recentDisbursementsStmt = $pdo->query("
    SELECT d.*, l.loanAccountNumber, c.fullName AS clientName, c.clientId AS clientCode, c.communityTown, u.username AS disbursedBy
    FROM loandisbursement d
    JOIN loan l ON d.loanId = l.id
    JOIN client c ON d.clientId = c.id
    JOIN user u ON d.disbursedByUserId = u.id
    ORDER BY d.disbursedAt DESC
    LIMIT 15
");
$recentDisbursements = $recentDisbursementsStmt->fetchAll();
?>

<!-- Alerts -->
<?php if ($success): ?>
<div class="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center space-x-2">
    <i data-lucide="check-circle" class="w-5 h-5 text-emerald-600"></i>
    <span><?= htmlspecialchars($success) ?></span>
</div>
<?php endif; ?>

<?php if ($error): ?>
<div class="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-center space-x-2">
    <i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>
    <span><?= htmlspecialchars($error) ?></span>
</div>
<?php endif; ?>

<!-- Top Info Banner: 1-Week Scheduling Rule -->
<div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start space-x-3">
    <div class="p-2 bg-emerald-100 rounded-xl text-emerald-700 mt-0.5">
        <i data-lucide="calendar-clock" class="w-5 h-5"></i>
    </div>
    <div>
        <div class="text-sm font-bold text-emerald-950">1-Week Repayment Grace Period Active</div>
        <div class="text-xs text-emerald-800 mt-0.5">
            By system policy, the first installment repayment date for every loan automatically commences <strong>exactly 1 week (7 days)</strong> after the disbursement date. All loan sums are verified against the Super Admin's lending capital allocation ceiling.
        </div>
    </div>
</div>

<!-- ========================================== -->
<!-- 1. APPROVED LOANS READY FOR DISBURSEMENT -->
<!-- ========================================== -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-8">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="badge-dollar-sign" class="w-5 h-5 text-emerald-600"></i>
                <span>Loans Awaiting Fund Disbursement</span>
            </h3>
            <p class="text-xs text-slate-500">Approved applications ready to be funded and scheduled</p>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
            <?= count($pendingLoans) ?> Ready
        </span>
    </div>

    <?php if (empty($pendingLoans)): ?>
    <div class="p-8 text-center text-slate-400 text-sm">
        No approved loans currently awaiting disbursement. Approve pending loan applications in the Loan Applications section.
    </div>
    <?php else: ?>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">Account / Client</th>
                    <th class="pb-3">Loan Product</th>
                    <th class="pb-3">Term & Frequency</th>
                    <th class="pb-3">First Due Date</th>
                    <th class="pb-3 text-right">Approved Principal</th>
                    <th class="pb-3 text-right">Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($pendingLoans as $pl): 
                    $previewFirstDue = date('d M Y', strtotime('+7 days'));
                ?>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($pl['clientName']) ?></div>
                        <div class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($pl['loanAccountNumber']) ?> &bull; <?= htmlspecialchars($pl['clientTown'] ?? 'Wassa Powuako') ?></div>
                    </td>
                    <td class="py-3 font-semibold text-slate-700"><?= htmlspecialchars($pl['productName']) ?></td>
                    <td class="py-3 text-xs text-slate-600">
                        <?= $pl['termMonths'] ?> Months &bull; <?= htmlspecialchars($pl['repaymentFrequency']) ?>
                    </td>
                    <td class="py-3">
                        <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            <?= $previewFirstDue ?> (+7 days)
                        </span>
                    </td>
                    <td class="py-3 text-right font-black text-slate-900 text-base">
                        <?= formatCurrency($pl['principalAmount']) ?>
                    </td>
                    <td class="py-3 text-right">
                        <form method="POST" action="disbursements.php" onsubmit="return confirm('Confirm disbursement of <?= formatCurrency($pl['principalAmount']) ?> to <?= htmlspecialchars($pl['clientName']) ?>? Repayments will begin 1 week from today.');" class="inline">
                            <input type="hidden" name="disburse_loan" value="1">
                            <input type="hidden" name="loan_id" value="<?= $pl['id'] ?>">
                            <button type="submit" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1 ml-auto">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                <span>Disburse Funds</span>
                            </button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- ========================================== -->
<!-- 2. RECENT DISBURSEMENTS RECORD -->
<!-- ========================================== -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="history" class="w-5 h-5 text-indigo-600"></i>
                <span>Disbursed Loans Registry</span>
            </h3>
            <p class="text-xs text-slate-500">History of loans disbursed with reference vouchers</p>
        </div>
    </div>

    <?php if (empty($recentDisbursements)): ?>
    <div class="p-8 text-center text-slate-400 text-sm">
        No loans have been disbursed yet.
    </div>
    <?php else: ?>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">Reference / Date</th>
                    <th class="pb-3">Client Name</th>
                    <th class="pb-3">Method</th>
                    <th class="pb-3">Disbursed By</th>
                    <th class="pb-3 text-right">Net Amount Disbursed</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($recentDisbursements as $rd): ?>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($rd['disbursementReference']) ?></div>
                        <div class="text-[11px] text-slate-400"><?= formatDateTime($rd['disbursedAt']) ?></div>
                    </td>
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($rd['clientName']) ?></div>
                        <div class="text-[11px] text-slate-500"><?= htmlspecialchars($rd['clientCode']) ?> &bull; <?= htmlspecialchars($rd['communityTown'] ?? 'Wassa Powuako') ?></div>
                    </td>
                    <td class="py-3">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            <?= htmlspecialchars(str_replace('_', ' ', $rd['paymentMethod'])) ?>
                        </span>
                    </td>
                    <td class="py-3 font-semibold text-slate-700"><?= htmlspecialchars($rd['disbursedBy']) ?></td>
                    <td class="py-3 text-right font-black text-emerald-600 text-base">
                        <?= formatCurrency($rd['netDisbursedAmount']) ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

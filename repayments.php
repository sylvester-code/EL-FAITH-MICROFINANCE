<?php
// EL-FAITH MICROFINANCE - Loan Repayment & Staff Collection Entry
$activePage = 'repayments';
$pageTitle = 'Loan Repayment & Staff Collections';

require_once __DIR__ . '/includes/header.php';

$success = '';
$error = '';

// Handle Keying in Repayment
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['record_repayment'])) {
    $loanId = intval($_POST['loan_id'] ?? 0);
    $amountPaid = floatval($_POST['amount_paid'] ?? 0);
    $paymentMethod = $_POST['payment_method'] ?? 'CASH';
    $reference = trim($_POST['reference'] ?? '');
    $notes = trim($_POST['notes'] ?? '');

    if ($loanId <= 0 || $amountPaid <= 0) {
        $error = 'Please select a valid loan and enter a positive repayment amount.';
    } else {
        // Fetch active loan
        $stmt = $pdo->prepare("
            SELECT l.*, c.fullName AS clientName, c.clientId AS clientCode, c.phone AS clientPhone, c.communityTown
            FROM loan l
            JOIN client c ON l.clientId = c.id
            WHERE l.id = ? AND l.status IN ('ACTIVE', 'DISBURSED', 'OVERDUE')
        ");
        $stmt->execute([$loanId]);
        $loan = $stmt->fetch();

        if (!$loan) {
            $error = 'Selected loan is not active or has already been fully paid.';
        } elseif ($amountPaid > floatval($loan['totalOutstanding']) + 0.05) {
            $error = 'Amount paid cannot exceed the outstanding balance of ' . formatCurrency($loan['totalOutstanding']);
        } else {
            // Calculate components
            $currentOutstanding = floatval($loan['totalOutstanding']);
            $currentPrincipal = floatval($loan['outstandingPrincipal']);
            $currentInterest = floatval($loan['outstandingInterest']);

            // Proportional split
            $interestRatio = $currentOutstanding > 0 ? ($currentInterest / $currentOutstanding) : 0;
            $interestComponent = round($amountPaid * $interestRatio, 2);
            $principalComponent = round($amountPaid - $interestComponent, 2);

            $newOutstandingPrincipal = max(0, $currentPrincipal - $principalComponent);
            $newOutstandingInterest = max(0, $currentInterest - $interestComponent);
            $newTotalOutstanding = max(0, $currentOutstanding - $amountPaid);

            $newStatus = ($newTotalOutstanding <= 0.01) ? 'FULLY_PAID' : $loan['status'];
            $receiptNumber = 'RCT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
            $paymentRef = !empty($reference) ? $reference : ('REF-' . date('His') . '-' . rand(100, 999));

            try {
                $pdo->beginTransaction();

                // Insert Repayment
                $repStmt = $pdo->prepare("
                    INSERT INTO repayment (
                        receiptNumber, loanId, clientId, paymentReference, amountPaid, paymentDate,
                        paymentMethod, transactionReference, principalComponent, interestComponent,
                        feesComponent, outstandingBalanceAfter, receivingCashierId, notes, createdAt
                    ) VALUES (
                        ?, ?, ?, ?, ?, NOW(3),
                        ?, ?, ?, ?,
                        0.00, ?, ?, ?, NOW(3)
                    )
                ");
                $repStmt->execute([
                    $receiptNumber,
                    $loan['id'],
                    $loan['clientId'],
                    $paymentRef,
                    $amountPaid,
                    $paymentMethod,
                    $reference ?: null,
                    $principalComponent,
                    $interestComponent,
                    $newTotalOutstanding,
                    $user['id'],
                    $notes ?: 'Staff collection'
                ]);

                // Update Loan
                $updLoan = $pdo->prepare("
                    UPDATE loan SET 
                        totalPaid = totalPaid + ?,
                        totalPrincipalPaid = totalPrincipalPaid + ?,
                        totalInterestPaid = totalInterestPaid + ?,
                        outstandingPrincipal = ?,
                        outstandingInterest = ?,
                        totalOutstanding = ?,
                        status = ?,
                        updatedAt = NOW(3)
                    WHERE id = ?
                ");
                $updLoan->execute([
                    $amountPaid,
                    $principalComponent,
                    $interestComponent,
                    $newOutstandingPrincipal,
                    $newOutstandingInterest,
                    $newTotalOutstanding,
                    $newStatus,
                    $loan['id']
                ]);

                $pdo->commit();
                $success = "Repayment of " . formatCurrency($amountPaid) . " successfully recorded for {$loan['clientName']}. Receipt: {$receiptNumber}";
            } catch (Exception $e) {
                $pdo->rollBack();
                $error = "Error recording repayment: " . $e->getMessage();
            }
        }
    }
}

// Fetch Active Loans with Client Details for the Key-In Dropdown
$activeLoansStmt = $pdo->query("
    SELECT 
        l.id,
        l.loanAccountNumber,
        l.totalOutstanding,
        l.principalAmount,
        c.fullName AS clientName,
        c.clientId AS clientCode,
        c.phone AS clientPhone,
        c.communityTown
    FROM loan l
    JOIN client c ON l.clientId = c.id
    WHERE l.status IN ('ACTIVE', 'DISBURSED', 'OVERDUE')
    ORDER BY c.fullName ASC
");
$activeLoans = $activeLoansStmt->fetchAll();

// Fetch All Collections (with Super Admin Customer & Collector Visibility)
$repaymentsStmt = $pdo->query("
    SELECT 
        r.*,
        l.loanAccountNumber,
        c.fullName AS clientName,
        c.clientId AS clientCode,
        c.phone AS clientPhone,
        c.communityTown AS clientTown,
        COALESCE(sp.fullName, u.username) AS collectorName,
        u.staffId AS collectorStaffId,
        u.role AS collectorRole
    FROM repayment r
    JOIN loan l ON r.loanId = l.id
    JOIN client c ON r.clientId = c.id
    JOIN user u ON r.receivingCashierId = u.id
    LEFT JOIN staffprofile sp ON u.id = sp.userId
    WHERE r.isReversed = 0
    ORDER BY r.createdAt DESC
");
$allRepayments = $repaymentsStmt->fetchAll();
?>

<!-- Status Alerts -->
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

<!-- Top Action Header -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight">Staff Loan Collection & Repayment Desk</h2>
        <p class="text-xs text-slate-500">Every staff member can receive and key in customer repayments with immediate Super Admin visibility</p>
    </div>

    <button type="button" onclick="document.getElementById('keyInModal').classList.remove('hidden')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2 self-start">
        <i data-lucide="plus-circle" class="w-4 h-4"></i>
        <span>Key In New Repayment</span>
    </button>
</div>

<!-- ========================================== -->
<!-- REPAYMENTS / COLLECTIONS LEDGER TABLE -->
<!-- ========================================== -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="receipt" class="w-5 h-5 text-emerald-600"></i>
                <span>All Loan Repayments & Collections Audit Ledger</span>
            </h3>
            <p class="text-xs text-slate-500">Includes customer name, phone, town, amount collected, and agent details</p>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
            <?= count($allRepayments) ?> Collections Total
        </span>
    </div>

    <?php if (empty($allRepayments)): ?>
    <div class="p-12 text-center text-slate-400">
        <i data-lucide="wallet" class="w-12 h-12 mx-auto text-slate-300 mb-2"></i>
        <p class="text-sm font-semibold">No customer repayments recorded yet.</p>
        <p class="text-xs text-slate-400 mt-1">Click "Key In New Repayment" to record money received from a customer.</p>
    </div>
    <?php else: ?>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">Receipt / Date</th>
                    <th class="pb-3">Customer Details</th>
                    <th class="pb-3">Community / Town</th>
                    <th class="pb-3">Payment Method</th>
                    <th class="pb-3">Collector / Agent</th>
                    <th class="pb-3 text-right">Amount Collected</th>
                    <th class="pb-3 text-right">Balance After</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($allRepayments as $r): ?>
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($r['receiptNumber']) ?></div>
                        <div class="text-[11px] text-slate-400"><?= formatDateTime($r['paymentDate']) ?></div>
                    </td>
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($r['clientName']) ?></div>
                        <div class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($r['clientCode']) ?> &bull; <?= htmlspecialchars($r['clientPhone']) ?></div>
                    </td>
                    <td class="py-3">
                        <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                            <?= htmlspecialchars($r['clientTown'] ?? 'Wassa Powuako') ?>
                        </span>
                    </td>
                    <td class="py-3">
                        <span class="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                            <?= htmlspecialchars(str_replace('_', ' ', $r['paymentMethod'])) ?>
                        </span>
                    </td>
                    <td class="py-3">
                        <div class="font-bold text-slate-800"><?= htmlspecialchars($r['collectorName']) ?></div>
                        <div class="text-[11px] text-slate-500"><?= htmlspecialchars(str_replace('_', ' ', $r['collectorRole'])) ?> (<?= htmlspecialchars($r['collectorStaffId'] ?? 'ID') ?>)</div>
                    </td>
                    <td class="py-3 text-right font-black text-emerald-600 text-base">
                        <?= formatCurrency($r['amountPaid']) ?>
                    </td>
                    <td class="py-3 text-right font-bold text-slate-600">
                        <?= formatCurrency($r['outstandingBalanceAfter']) ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- ========================================== -->
<!-- MODAL: KEY IN REPAYMENT FORM -->
<!-- ========================================== -->
<div id="keyInModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
                <h3 class="text-base font-extrabold text-slate-900">Key In Customer Repayment</h3>
                <p class="text-xs text-slate-500">Record cash or mobile money collected from a borrower</p>
            </div>
            <button type="button" onclick="document.getElementById('keyInModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <form method="POST" action="repayments.php" class="space-y-4">
            <input type="hidden" name="record_repayment" value="1">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Customer & Active Loan</label>
                <select name="loan_id" id="loanSelect" required onchange="updateSelectedLoanInfo()" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">-- Choose Borrower --</option>
                    <?php foreach ($activeLoans as $al): ?>
                    <option value="<?= $al['id'] ?>" data-balance="<?= $al['totalOutstanding'] ?>" data-town="<?= htmlspecialchars($al['communityTown'] ?? 'Wassa Powuako') ?>" data-phone="<?= htmlspecialchars($al['clientPhone']) ?>">
                        <?= htmlspecialchars($al['clientName']) ?> (<?= $al['clientCode'] ?>) — Outstanding: <?= formatCurrency($al['totalOutstanding']) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
                <div id="loanBalanceHelper" class="text-xs text-slate-500 mt-1 hidden">
                    Outstanding Balance: <strong id="balanceText" class="text-emerald-700"></strong> &bull; Town: <span id="townText" class="font-semibold text-slate-700"></span>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Amount Collected (GH₵)</label>
                    <div class="relative">
                        <span class="absolute left-3 top-2 font-bold text-slate-400 text-xs">GH₵</span>
                        <input type="number" step="0.01" min="1" id="amountPaidInput" name="amount_paid" required placeholder="0.00" class="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Payment Method</label>
                    <select name="payment_method" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="CASH">Cash (Cashier / Field)</option>
                        <option value="MOBILE_MONEY">Mobile Money (MTN / Telecel)</option>
                        <option value="BANK_TRANSFER">Bank Transfer (GCB Bank)</option>
                        <option value="CHEQUE">Cheque</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">MoMo Transaction ID / Reference (Optional)</label>
                <input type="text" name="reference" placeholder="e.g. 20938475892 or receipt notes" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Collection Notes (Optional)</label>
                <textarea name="notes" rows="2" placeholder="e.g. Weekly installment collected at Powuako Market" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" onclick="document.getElementById('keyInModal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    <span>Confirm & Record Collection</span>
                </button>
            </div>
        </form>
    </div>
</div>

<script>
function updateSelectedLoanInfo() {
    const sel = document.getElementById('loanSelect');
    const opt = sel.options[sel.selectedIndex];
    const helper = document.getElementById('loanBalanceHelper');
    if (!opt || !opt.value) {
        helper.classList.add('hidden');
        return;
    }
    const balance = parseFloat(opt.getAttribute('data-balance') || 0);
    const town = opt.getAttribute('data-town') || 'Wassa Powuako';
    document.getElementById('balanceText').innerText = 'GH₵ ' + balance.toFixed(2);
    document.getElementById('townText').innerText = town;
    helper.classList.remove('hidden');
    document.getElementById('amountPaidInput').max = balance;
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

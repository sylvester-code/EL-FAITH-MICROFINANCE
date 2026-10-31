<?php
// EL-FAITH MICROFINANCE - Executive & Operational Dashboard
$activePage = 'dashboard';
$pageTitle = 'Executive Financial Dashboard';

require_once __DIR__ . '/includes/header.php';

// Handle Super Admin Loan Allocation Update
$successMessage = '';
$errorMessage = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_allocation'])) {
    if (!isSuperAdmin()) {
        $errorMessage = 'Only Super Administrator can update the lending allocation fund.';
    } else {
        $newAllocation = floatval($_POST['total_allocation'] ?? 0);
        if ($newAllocation <= 0) {
            $errorMessage = 'Total loan allocation must be a positive amount.';
        } else {
            $stmt = $pdo->prepare("REPLACE INTO systemsetting (`key`, `value`, `description`, `updatedAt`) VALUES ('TOTAL_LOAN_ALLOCATION', ?, 'Total allocated fund ceiling', NOW(3))");
            $stmt->execute([number_format($newAllocation, 2, '.', '')]);
            $successMessage = 'Total loan allocation fund successfully updated to ' . formatCurrency($newAllocation);
        }
    }
}

// 1. Fetch Total Loan Allocation
$allocStmt = $pdo->query("SELECT `value` FROM systemsetting WHERE `key` = 'TOTAL_LOAN_ALLOCATION'");
$totalAllocation = floatval($allocStmt->fetchColumn() ?: 500000.00);

// 2. Fetch Total Disbursed
$disbStmt = $pdo->query("SELECT COALESCE(SUM(principalAmount), 0) FROM loan WHERE status IN ('ACTIVE', 'DISBURSED', 'OVERDUE', 'FULLY_PAID')");
$totalDisbursed = floatval($disbStmt->fetchColumn() ?: 0);

// 3. Available Lending Capital
$availableCapital = max(0, $totalAllocation - $totalDisbursed);
$allocationUsedPercent = $totalAllocation > 0 ? min(100, round(($totalDisbursed / $totalAllocation) * 100, 1)) : 0;

// 4. Fetch Total Collections (all non-reversed repayments)
$repayStmt = $pdo->query("
    SELECT 
        COALESCE(SUM(amountPaid), 0) AS totalCollected,
        COALESCE(SUM(principalComponent), 0) AS totalPrincipalRecovered,
        COALESCE(SUM(interestComponent), 0) AS grossInterestProfit,
        COUNT(id) AS totalReceipts
    FROM repayment 
    WHERE isReversed = 0
");
$repayData = $repayStmt->fetch() ?: [];
$totalCollected = floatval($repayData['totalCollected'] ?? 0);
$principalRecovered = floatval($repayData['totalPrincipalRecovered'] ?? 0);
$grossInterestProfit = floatval($repayData['grossInterestProfit'] ?? 0);

// 5. Operating Expenses
$expStmt = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM expense WHERE status = 'APPROVED'");
$totalExpenses = floatval($expStmt->fetchColumn() ?: 0);
$netProfit = $grossInterestProfit - $totalExpenses;

// 6. Outstanding Portfolio & Active Loans Count
$loanStatsStmt = $pdo->query("
    SELECT 
        COUNT(CASE WHEN status IN ('ACTIVE', 'DISBURSED') THEN 1 END) AS activeLoansCount,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) AS overdueLoansCount,
        COALESCE(SUM(CASE WHEN status IN ('ACTIVE', 'DISBURSED', 'OVERDUE') THEN totalOutstanding ELSE 0 END), 0) AS totalPortfolioBalance
    FROM loan
");
$loanStats = $loanStatsStmt->fetch() ?: [];
$activeLoansCount = intval($loanStats['activeLoansCount'] ?? 0);
$overdueLoansCount = intval($loanStats['overdueLoansCount'] ?? 0);
$portfolioBalance = floatval($loanStats['totalPortfolioBalance'] ?? 0);

// 7. Total Registered Clients
$clientCountStmt = $pdo->query("SELECT COUNT(id) FROM client WHERE status = 'ACTIVE'");
$totalClients = intval($clientCountStmt->fetchColumn() ?: 0);

// 8. Staff / Agent Collections Breakdown
$agentCollectionsStmt = $pdo->query("
    SELECT 
        u.id AS userId,
        u.username,
        u.role,
        u.staffId,
        COALESCE(sp.fullName, u.username) AS staffName,
        COUNT(r.id) AS collectionCount,
        COALESCE(SUM(r.amountPaid), 0) AS totalAmountCollected
    FROM user u
    LEFT JOIN staffprofile sp ON u.id = sp.userId
    INNER JOIN repayment r ON r.receivingCashierId = u.id AND r.isReversed = 0
    GROUP BY u.id, u.username, u.role, u.staffId, sp.fullName
    ORDER BY totalAmountCollected DESC
");
$agentCollections = $agentCollectionsStmt->fetchAll();

// 9. Recent Collections with Client & Collector Details
$recentRepaymentsStmt = $pdo->query("
    SELECT 
        r.*,
        c.fullName AS clientName,
        c.clientId AS clientCode,
        c.phone AS clientPhone,
        c.communityTown AS clientTown,
        COALESCE(sp.fullName, u.username) AS collectorName,
        u.role AS collectorRole
    FROM repayment r
    JOIN client c ON r.clientId = c.id
    JOIN user u ON r.receivingCashierId = u.id
    LEFT JOIN staffprofile sp ON u.id = sp.userId
    WHERE r.isReversed = 0
    ORDER BY r.createdAt DESC
    LIMIT 6
");
$recentRepayments = $recentRepaymentsStmt->fetchAll();
?>

<!-- Alerts -->
<?php if ($successMessage): ?>
<div class="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center space-x-2">
    <i data-lucide="check-circle" class="w-5 h-5 text-emerald-600"></i>
    <span><?= htmlspecialchars($successMessage) ?></span>
</div>
<?php endif; ?>

<?php if ($errorMessage): ?>
<div class="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-center space-x-2">
    <i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>
    <span><?= htmlspecialchars($errorMessage) ?></span>
</div>
<?php endif; ?>

<!-- ========================================== -->
<!-- 1. SUPER ADMIN LENDING CAPITAL & PROFIT OVERVIEW -->
<!-- ========================================== -->
<div class="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-700 mb-8 relative overflow-hidden">
    <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/60">
        <div>
            <div class="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>Executive Oversight &bull; Super Administrator Controlled</span>
            </div>
            <h2 class="text-2xl font-black tracking-tight text-white mt-1">Lending Capital Allocation & Profit Engine</h2>
            <p class="text-xs text-slate-400 mt-0.5">Real-time financial solvency, disbursements ceiling, and revenue metrics</p>
        </div>

        <?php if (isSuperAdmin()): ?>
        <button type="button" onclick="document.getElementById('allocationModal').classList.remove('hidden')" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2">
            <i data-lucide="sliders" class="w-4 h-4"></i>
            <span>Set Total Loan Fund Allocation</span>
        </button>
        <?php endif; ?>
    </div>

    <!-- Capital Allocation & Profit Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Card 1: Total Loan Allocation -->
        <div class="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Loan Allocation Fund</div>
            <div class="text-xl font-extrabold text-white"><?= formatCurrency($totalAllocation) ?></div>
            <div class="text-[11px] text-emerald-400 font-semibold mt-1">Lending Ceiling Cap</div>
        </div>

        <!-- Card 2: Total Disbursed -->
        <div class="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Disbursed to Date</div>
            <div class="text-xl font-extrabold text-white"><?= formatCurrency($totalDisbursed) ?></div>
            <div class="text-[11px] text-slate-400 font-medium mt-1"><?= $allocationUsedPercent ?>% of fund allocated</div>
        </div>

        <!-- Card 3: Available Lending Pool -->
        <div class="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Available Capital Pool</div>
            <div class="text-xl font-extrabold text-emerald-400"><?= formatCurrency($availableCapital) ?></div>
            <div class="text-[11px] text-emerald-300 font-medium mt-1">Remaining to disburse</div>
        </div>

        <!-- Card 4: Total Collections -->
        <div class="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Collections (Staff)</div>
            <div class="text-xl font-extrabold text-white"><?= formatCurrency($totalCollected) ?></div>
            <div class="text-[11px] text-cyan-400 font-medium mt-1"><?= intval($repayData['totalReceipts'] ?? 0) ?> repayments received</div>
        </div>

        <!-- Card 5: Net Profit -->
        <div class="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Net Operating Profit</div>
            <div class="text-xl font-extrabold <?= $netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' ?>"><?= formatCurrency($netProfit) ?></div>
            <div class="text-[11px] text-slate-400 font-medium mt-1">Gross: <?= formatCurrency($grossInterestProfit) ?></div>
        </div>
    </div>
</div>

<!-- ========================================== -->
<!-- 2. QUICK STATS ROW -->
<!-- ========================================== -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Borrowers</div>
            <div class="text-2xl font-black text-slate-900 mt-1"><?= $activeLoansCount ?></div>
            <div class="text-xs text-emerald-600 font-semibold mt-1">Healthy standing</div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <i data-lucide="check-circle" class="w-6 h-6"></i>
        </div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Portfolio at Risk (Overdue)</div>
            <div class="text-2xl font-black text-red-600 mt-1"><?= $overdueLoansCount ?></div>
            <div class="text-xs text-red-500 font-semibold mt-1">Requires follow-up</div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <i data-lucide="alert-triangle" class="w-6 h-6"></i>
        </div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding Portfolio</div>
            <div class="text-2xl font-black text-slate-900 mt-1"><?= formatCurrency($portfolioBalance) ?></div>
            <div class="text-xs text-slate-500 font-medium mt-1">Principal + Interest due</div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <i data-lucide="trending-up" class="w-6 h-6"></i>
        </div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Client Directory</div>
            <div class="text-2xl font-black text-slate-900 mt-1"><?= $totalClients ?></div>
            <div class="text-xs text-slate-500 font-medium mt-1">Wassa Powuako community</div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <i data-lucide="users" class="w-6 h-6"></i>
        </div>
    </div>
</div>

<!-- ========================================== -->
<!-- 3. AGENT COLLECTIONS BREAKDOWN WIDGET -->
<!-- ========================================== -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-8">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="coins" class="w-5 h-5 text-emerald-600"></i>
                <span>Agent & Staff Collections Breakdown</span>
            </h3>
            <p class="text-xs text-slate-500">Real-time collections keyed in by loan officers, cashiers, and field agents</p>
        </div>
        <a href="repayments.php" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <span>Key In Repayment</span> &rarr;
        </a>
    </div>

    <?php if (empty($agentCollections)): ?>
    <div class="p-8 text-center text-slate-400 text-sm">
        No staff collections recorded yet. All staff can key in customer repayments from the Loan Repayments page.
    </div>
    <?php else: ?>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">Staff Member</th>
                    <th class="pb-3">Role</th>
                    <th class="pb-3">Staff ID</th>
                    <th class="pb-3 text-center">Receipts Count</th>
                    <th class="pb-3 text-right">Total Money Collected</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($agentCollections as $agent): ?>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3 font-bold text-slate-900 flex items-center space-x-2">
                        <div class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                            <?= strtoupper(substr($agent['staffName'], 0, 1)) ?>
                        </div>
                        <span><?= htmlspecialchars($agent['staffName']) ?></span>
                    </td>
                    <td class="py-3">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            <?= htmlspecialchars(str_replace('_', ' ', $agent['role'])) ?>
                        </span>
                    </td>
                    <td class="py-3 font-mono text-xs text-slate-500"><?= htmlspecialchars($agent['staffId'] ?? '—') ?></td>
                    <td class="py-3 text-center font-bold text-slate-700"><?= intval($agent['collectionCount']) ?></td>
                    <td class="py-3 text-right font-black text-emerald-600"><?= formatCurrency($agent['totalAmountCollected']) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- ========================================== -->
<!-- 4. RECENT REPAYMENTS AUDIT FEED -->
<!-- ========================================== -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="receipt" class="w-5 h-5 text-indigo-600"></i>
                <span>Recent Customer Repayments & Collector Trail</span>
            </h3>
            <p class="text-xs text-slate-500">Live payment receipts with customer details (phone, town) and collector identity</p>
        </div>
        <a href="repayments.php" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <span>View All Repayments</span> &rarr;
        </a>
    </div>

    <?php if (empty($recentRepayments)): ?>
    <div class="p-8 text-center text-slate-400 text-sm">
        No loan repayments have been made yet.
    </div>
    <?php else: ?>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">Date & Receipt</th>
                    <th class="pb-3">Customer Details</th>
                    <th class="pb-3">Community / Town</th>
                    <th class="pb-3">Collected By</th>
                    <th class="pb-3 text-right">Amount Paid</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($recentRepayments as $r): ?>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($r['receiptNumber']) ?></div>
                        <div class="text-[11px] text-slate-400"><?= formatDate($r['paymentDate']) ?></div>
                    </td>
                    <td class="py-3">
                        <div class="font-bold text-slate-800"><?= htmlspecialchars($r['clientName']) ?></div>
                        <div class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($r['clientCode']) ?> &bull; <?= htmlspecialchars($r['clientPhone']) ?></div>
                    </td>
                    <td class="py-3">
                        <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                            <?= htmlspecialchars($r['clientTown'] ?? 'Wassa Powuako') ?>
                        </span>
                    </td>
                    <td class="py-3">
                        <div class="font-bold text-slate-800"><?= htmlspecialchars($r['collectorName']) ?></div>
                        <div class="text-[11px] text-slate-500"><?= htmlspecialchars(str_replace('_', ' ', $r['collectorRole'])) ?></div>
                    </td>
                    <td class="py-3 text-right font-black text-emerald-600 text-base">
                        <?= formatCurrency($r['amountPaid']) ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- ========================================== -->
<!-- MODAL: SET TOTAL LOAN ALLOCATION -->
<!-- ========================================== -->
<div id="allocationModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="shield-check" class="w-5 h-5 text-emerald-600"></i>
                <span>Allocate Total Loan Lending Ceiling</span>
            </h3>
            <button type="button" onclick="document.getElementById('allocationModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <form method="POST" action="dashboard.php" class="space-y-4">
            <input type="hidden" name="update_allocation" value="1">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Total Loan Capital Fund Allocation (GH₵)</label>
                <div class="relative">
                    <span class="absolute left-3.5 top-2.5 font-bold text-slate-400">GH₵</span>
                    <input type="number" step="0.01" min="1000" name="total_allocation" required value="<?= htmlspecialchars($totalAllocation) ?>" class="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Sets the maximum ceiling of loan money that can be disbursed across all borrowers.</p>
            </div>

            <div class="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onclick="document.getElementById('allocationModal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition">
                    Save Allocation Ceiling
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

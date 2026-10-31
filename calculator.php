<?php
// EL-FAITH MICROFINANCE - Interactive Loan Calculator
// Schedule automatically starts exactly 1 week (7 days) after disbursement
require_once __DIR__ . '/config/auth.php';
requireExecutive();

$activePage = 'calculator';
$pageTitle = 'Loan Schedule Calculator';

require_once __DIR__ . '/includes/header.php';

$principal = floatval($_GET['principal'] ?? 5000);
$rate = floatval($_GET['rate'] ?? 10);
$termMonths = intval($_GET['term'] ?? 1);
$frequency = $_GET['frequency'] ?? 'DAILY';
$startDateStr = $_GET['start_date'] ?? date('Y-m-d');

// Calculations
$totalInterest = round($principal * ($rate / 100) * ($termMonths / 12), 2);
$totalRepayable = round($principal + $totalInterest, 2);

if ($frequency === 'DAILY') {
    $installmentCount = max(1, $termMonths * 30);
} elseif ($frequency === 'WEEKLY') {
    $installmentCount = max(1, $termMonths * 4);
} else {
    $installmentCount = max(1, $termMonths);
}
$installmentAmount = round($totalRepayable / $installmentCount, 2);

// Generate Schedule
$schedule = [];
$balance = $totalRepayable;
$currentDate = new DateTime($startDateStr);

// Policy: First installment due 1 WEEK (7 DAYS) after disbursement!
$currentDate->modify('+7 days');

for ($i = 1; $i <= $installmentCount; $i++) {
    $prinPart = round($principal / $installmentCount, 2);
    $intPart = round($totalInterest / $installmentCount, 2);
    $balance = max(0, $balance - $installmentAmount);

    $schedule[] = [
        'installment' => $i,
        'dueDate' => clone $currentDate,
        'principal' => $prinPart,
        'interest' => $intPart,
        'total' => $installmentAmount,
        'balance' => $balance,
    ];

    if ($frequency === 'DAILY') {
        $currentDate->modify('+1 day');
    } elseif ($frequency === 'WEEKLY') {
        $currentDate->modify('+7 days');
    } else {
        $currentDate->modify('+1 month');
    }
}
?>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    <!-- Calculator Input Form -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 class="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
            <i data-lucide="calculator" class="w-5 h-5 text-emerald-600"></i>
            <span>Loan Parameters</span>
        </h3>
        <p class="text-xs text-slate-500 mb-6">First installment starts 1 week after disbursement date</p>

        <form method="GET" action="calculator.php" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Principal Amount (GH₵)</label>
                <div class="relative">
                    <span class="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">GH₵</span>
                    <input type="number" step="100" min="100" name="principal" value="<?= htmlspecialchars($principal) ?>" required class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Interest Rate (%)</label>
                    <input type="number" step="0.5" min="1" max="100" name="rate" value="<?= htmlspecialchars($rate) ?>" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Term (Months)</label>
                    <input type="number" min="1" max="36" name="term" value="<?= htmlspecialchars($termMonths) ?>" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Repayment Frequency</label>
                    <select name="frequency" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="DAILY" <?= $frequency === 'DAILY' ? 'selected' : '' ?>>Daily (Standard Susu / Microfinance)</option>
                        <option value="WEEKLY" <?= $frequency === 'WEEKLY' ? 'selected' : '' ?>>Weekly</option>
                        <option value="MONTHLY" <?= $frequency === 'MONTHLY' ? 'selected' : '' ?>>Monthly</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Disbursement Date</label>
                    <input type="date" name="start_date" value="<?= htmlspecialchars($startDateStr) ?>" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
            </div>

            <button type="submit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 mt-2">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                <span>Recalculate Schedule</span>
            </button>
        </form>
    </div>

    <!-- Summary Overview Card -->
    <div class="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
        <div>
            <div class="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
                <span>Schedule Summary &bull; 1-Week First Due Policy</span>
            </div>
            <h2 class="text-2xl font-black text-white">Projected Amortization Plan</h2>
            <p class="text-xs text-slate-400 mt-1">First payment starts <strong><?= $schedule[0]['dueDate']->format('l, d F Y') ?></strong> (7 days after disbursement)</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
            <div class="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Gross Principal</div>
                <div class="text-lg font-black text-white mt-0.5"><?= formatCurrency($principal) ?></div>
            </div>
            <div class="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Total Interest</div>
                <div class="text-lg font-black text-emerald-400 mt-0.5"><?= formatCurrency($totalInterest) ?></div>
            </div>
            <div class="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Total Repayable</div>
                <div class="text-lg font-black text-white mt-0.5"><?= formatCurrency($totalRepayable) ?></div>
            </div>
            <div class="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Installment Amount</div>
                <div class="text-lg font-black text-yellow-400 mt-0.5"><?= formatCurrency($installmentAmount) ?></div>
                <div class="text-[10px] text-slate-400 mt-0.5"><?= $installmentCount ?> payments</div>
            </div>
        </div>

        <div class="text-xs text-slate-400 flex items-center space-x-2">
            <i data-lucide="info" class="w-4 h-4 text-emerald-400 flex-shrink-0"></i>
            <span>Policy Enforced: First repayment due date is 1 week (7 days) post-disbursement.</span>
        </div>
    </div>
</div>

<!-- Amortization Schedule Table -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <i data-lucide="list-ordered" class="w-5 h-5 text-emerald-600"></i>
            <span>Installment Repayment Timeline</span>
        </h3>
        <span class="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
            <?= count($schedule) ?> Installments
        </span>
    </div>

    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">#</th>
                    <th class="pb-3">Scheduled Due Date</th>
                    <th class="pb-3 text-right">Principal</th>
                    <th class="pb-3 text-right">Interest (10%)</th>
                    <th class="pb-3 text-right">Installment Amount</th>
                    <th class="pb-3 text-right">Remaining Balance</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($schedule as $row): 
                    $isFirst = ($row['installment'] === 1);
                ?>
                <tr class="hover:bg-slate-50 transition <?= $isFirst ? 'bg-emerald-50/40 font-semibold' : '' ?>">
                    <td class="py-3 font-bold text-slate-900"><?= $row['installment'] ?></td>
                    <td class="py-3">
                        <span class="font-bold text-slate-900"><?= $row['dueDate']->format('d M Y') ?></span>
                        <?php if ($isFirst): ?>
                            <span class="text-[10px] ml-2 px-1.5 py-0.5 rounded font-black bg-emerald-200 text-emerald-900 uppercase">First Due (+7 Days)</span>
                        <?php endif; ?>
                    </td>
                    <td class="py-3 text-right text-slate-600"><?= formatCurrency($row['principal']) ?></td>
                    <td class="py-3 text-right text-slate-600"><?= formatCurrency($row['interest']) ?></td>
                    <td class="py-3 text-right font-black text-emerald-600"><?= formatCurrency($row['total']) ?></td>
                    <td class="py-3 text-right font-bold text-slate-800"><?= formatCurrency($row['balance']) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>


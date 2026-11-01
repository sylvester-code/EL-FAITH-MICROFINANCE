<?php
// EL-FAITH MICROFINANCE - Official Loan Repayment Receipt Generator
// Location: Wassa Powuako, Western Region, Ghana

require_once __DIR__ . '/config/auth.php';
requireLogin();

$receiptNo = trim($_GET['receipt_no'] ?? $_GET['id'] ?? '');

if (empty($receiptNo)) {
    die("Error: No receipt number specified.");
}

$stmt = $pdo->prepare("
    SELECT 
        r.*,
        l.loanAccountNumber,
        l.principalAmount AS loanOriginalPrincipal,
        l.totalScheduledRepayment,
        l.status AS loanStatus,
        c.fullName AS clientName,
        c.clientId AS clientCode,
        c.phone AS clientPhone,
        c.communityTown AS clientTown,
        c.residentialAddress AS clientAddress,
        c.ghanaCardNumber AS clientGhanaCard,
        COALESCE(sp.fullName, u.username) AS collectorName,
        u.staffId AS collectorStaffId,
        u.role AS collectorRole
    FROM repayment r
    JOIN loan l ON r.loanId = l.id
    JOIN client c ON r.clientId = c.id
    JOIN user u ON r.receivingCashierId = u.id
    LEFT JOIN staffprofile sp ON u.id = sp.userId
    WHERE r.receiptNumber = ? OR r.id = ?
    LIMIT 1
");
$stmt->execute([$receiptNo, $receiptNo]);
$receipt = $stmt->fetch();

if (!$receipt) {
    die("Error: Receipt not found.");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt <?= htmlspecialchars($receipt['receiptNumber']) ?> | <?= APP_NAME ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; }
            .receipt-box { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
    </style>
</head>
<body class="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center">

    <!-- Action Toolbar (Hidden during print) -->
    <div class="no-print w-full max-w-xl mb-4 flex items-center justify-between">
        <a href="repayments.php" class="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Back to Repayments</span>
        </a>

        <div class="flex items-center gap-2">
            <button onclick="window.print()" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5">
                <i data-lucide="printer" class="w-4 h-4"></i>
                <span>Print Official Receipt</span>
            </button>
        </div>
    </div>

    <!-- Official Printable Receipt Container -->
    <div class="receipt-box bg-white max-w-xl w-full p-8 rounded-3xl shadow-xl border border-slate-200 text-slate-900 relative overflow-hidden">
        
        <!-- Header & Branding -->
        <div class="border-b-2 border-slate-900 pb-5 mb-5 flex items-start justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    EF
                </div>
                <div>
                    <h1 class="text-xl font-black tracking-tight text-slate-950 uppercase"><?= APP_NAME ?></h1>
                    <div class="text-xs font-semibold text-emerald-800 uppercase tracking-wider"><?= APP_LOCATION ?></div>
                    <div class="text-[11px] text-slate-500">Tel: +233 24 556 7890 &bull; Licensed Microfinance Core</div>
                </div>
            </div>

            <div class="text-right">
                <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Official Cash Receipt
                </span>
                <div class="text-xs font-mono font-black text-slate-900 mt-1"><?= htmlspecialchars($receipt['receiptNumber']) ?></div>
            </div>
        </div>

        <!-- Receipt Meta Banner: Date & Time -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-5 grid grid-cols-2 gap-3 text-xs">
            <div>
                <span class="text-slate-400 font-bold uppercase text-[10px] block">Payment Date & Time:</span>
                <span class="font-bold text-slate-900"><?= date('d F Y', strtotime($receipt['paymentDate'])) ?></span>
                <span class="text-emerald-700 font-mono font-bold ml-1"><?= date('h:i:s A', strtotime($receipt['paymentDate'])) ?></span>
            </div>
            <div>
                <span class="text-slate-400 font-bold uppercase text-[10px] block">Loan Account Number:</span>
                <span class="font-mono font-black text-slate-900"><?= htmlspecialchars($receipt['loanAccountNumber']) ?></span>
            </div>
        </div>

        <!-- Customer Profile Information -->
        <div class="mb-5">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer / Borrower Details</div>
            <div class="bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-base font-black text-slate-950"><?= htmlspecialchars($receipt['clientName']) ?></div>
                        <div class="text-xs text-slate-600 font-mono mt-0.5">
                            Client ID: <strong class="text-slate-900"><?= htmlspecialchars($receipt['clientCode']) ?></strong>
                            &bull; Phone: <?= htmlspecialchars($receipt['clientPhone']) ?>
                        </div>
                    </div>
                    <span class="text-xs px-2.5 py-1 bg-white border border-slate-200 font-bold text-emerald-800 rounded-xl">
                        <?= htmlspecialchars($receipt['clientTown'] ?? 'Wassa Powuako') ?>
                    </span>
                </div>
            </div>
        </div>

        <!-- Payment Breakdown Details -->
        <div class="mb-5">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Repayment Breakdown & Method</div>
            <div class="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table class="w-full">
                    <tbody class="divide-y divide-slate-100">
                        <tr class="bg-slate-50/60 font-semibold text-slate-600">
                            <td class="py-2.5 px-4">Payment Channel / Method</td>
                            <td class="py-2.5 px-4 text-right font-bold text-slate-900 uppercase">
                                <?= htmlspecialchars(str_replace('_', ' ', $receipt['paymentMethod'])) ?>
                            </td>
                        </tr>
                        <?php if (!empty($receipt['paymentReference'])): ?>
                        <tr class="text-slate-600">
                            <td class="py-2.5 px-4">Transaction Reference / MoMo ID</td>
                            <td class="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                <?= htmlspecialchars($receipt['paymentReference']) ?>
                            </td>
                        </tr>
                        <?php endif; ?>
                        <tr class="text-slate-600">
                            <td class="py-2 px-4">Principal Component Recovered</td>
                            <td class="py-2 px-4 text-right font-semibold text-slate-800">
                                <?= formatCurrency($receipt['principalComponent']) ?>
                            </td>
                        </tr>
                        <tr class="text-slate-600">
                            <td class="py-2 px-4">Interest Component Paid</td>
                            <td class="py-2 px-4 text-right font-semibold text-slate-800">
                                <?= formatCurrency($receipt['interestComponent']) ?>
                            </td>
                        </tr>
                        <tr class="bg-emerald-50/70 border-t-2 border-emerald-300">
                            <td class="py-3 px-4 font-black text-emerald-950 text-sm">TOTAL AMOUNT COLLECTED</td>
                            <td class="py-3 px-4 text-right font-black text-emerald-700 text-lg">
                                <?= formatCurrency($receipt['amountPaid']) ?>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Outstanding Remaining Balance Highlight Card -->
        <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 mb-6 shadow-md flex items-center justify-between">
            <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Loan Balance</span>
                <div class="text-2xl font-black text-yellow-400 mt-0.5">
                    <?= formatCurrency($receipt['outstandingBalanceAfter']) ?>
                </div>
                <div class="text-[11px] text-slate-300 mt-0.5">
                    Status: <span class="font-bold text-white"><?= floatval($receipt['outstandingBalanceAfter']) <= 0.01 ? 'FULLY PAID' : 'ACTIVE LOAN' ?></span>
                </div>
            </div>

            <div class="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-yellow-400">
                <i data-lucide="wallet" class="w-6 h-6"></i>
            </div>
        </div>

        <!-- Staff / Receiving Cashier Signature & Stamp -->
        <div class="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 items-end text-xs">
            <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Received & Keyed In By:</span>
                <div class="font-extrabold text-slate-900"><?= htmlspecialchars($receipt['collectorName']) ?></div>
                <div class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($receipt['collectorStaffId'] ?? 'STAFF') ?> &bull; <?= htmlspecialchars(str_replace('_', ' ', $receipt['collectorRole'])) ?></div>
            </div>

            <div class="text-right">
                <div class="inline-block border-2 border-dashed border-emerald-600 rounded-xl px-3 py-1.5 text-center">
                    <span class="text-[9px] font-black uppercase text-emerald-800 tracking-wider block">EL-FAITH MICROFINANCE</span>
                    <span class="text-[8px] font-bold text-emerald-600 block">AUTHENTIC CASH VOUCHER</span>
                    <span class="text-[8px] font-mono text-slate-400 block"><?= date('Y-m-d H:i:s') ?></span>
                </div>
            </div>
        </div>

        <!-- Receipt Footer Note -->
        <div class="text-center mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            Thank you for your prompt repayment. Please keep this official receipt safe for your financial records.
        </div>
    </div>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>

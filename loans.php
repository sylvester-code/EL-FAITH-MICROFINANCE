<?php
// EL-FAITH MICROFINANCE - Loan Applications & Super Admin Approval
// Super Admin determines and authorizes the loan amounts
require_once __DIR__ . '/config/auth.php';
requireExecutive();

$activePage = 'loans';
$pageTitle = 'Loan Applications & Approvals';

require_once __DIR__ . '/includes/header.php';

$success = '';
$error = '';

// Handle Application Approval / Rejection (Super Admin & CEO only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['review_application'])) {
    if (!isCeoOrSuperAdmin()) {
        $error = 'Authorization denied: Only Super Administrator or CEO can approve or reject loan applications.';
    } else {
        $appId = intval($_POST['app_id'] ?? 0);
        $decision = $_POST['decision'] ?? 'APPROVED';
        $approvedAmount = floatval($_POST['approved_amount'] ?? 0);
        $comments = trim($_POST['comments'] ?? '');

        $appStmt = $pdo->prepare("
            SELECT a.*, c.fullName AS clientName, p.name AS productName, p.defaultInterestRate, p.interestMethod, p.repaymentFrequency
            FROM loanapplication a
            JOIN client c ON a.clientId = c.id
            JOIN loanproduct p ON a.productId = p.id
            WHERE a.id = ?
        ");
        $appStmt->execute([$appId]);
        $app = $appStmt->fetch();

        if (!$app) {
            $error = 'Loan application not found.';
        } else {
            try {
                $pdo->beginTransaction();

                if ($decision === 'APPROVED') {
                    $principal = ($approvedAmount > 0) ? $approvedAmount : floatval($app['requestedAmount']);
                    $rate = floatval($app['defaultInterestRate'] ?: 10.00);
                    $termMonths = intval($app['requestedTermMonths']) ?: 6;
                    $method = $app['interestMethod'] ?: 'FLAT_RATE';
                    $freq = 'DAILY';

                    // Interest calculation
                    $totalInterest = round($principal * ($rate / 100) * ($termMonths / 12), 2);
                    $totalRepayment = round($principal + $totalInterest, 2);

                    // 1. Update Application
                    $updApp = $pdo->prepare("
                        UPDATE loanapplication SET 
                            status = 'APPROVED',
                            finalApprovedAmount = ?,
                            approvalNotes = ?,
                            reviewedByUserId = ?,
                            reviewedAt = NOW(3),
                            updatedAt = NOW(3)
                        WHERE id = ?
                    ");
                    $updApp->execute([$principal, $comments ?: 'Approved by Super Administrator', $user['id'], $app['id']]);

                    // 2. Create or Update Loan Record
                    $loanAccNo = 'LN-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
                    $insLoan = $pdo->prepare("
                        INSERT INTO loan (
                            loanAccountNumber, applicationId, clientId, productId, branchId,
                            principalAmount, approvedInterestRate, interestMethod, repaymentFrequency,
                            termMonths, totalScheduledInterest, totalFees, totalScheduledRepayment,
                            totalPrincipalPaid, totalInterestPaid, totalFeesPaid, totalPaid,
                            outstandingPrincipal, outstandingInterest, outstandingFees, totalOutstanding,
                            status, createdAt, updatedAt
                        ) VALUES (
                            ?, ?, ?, ?, 1,
                            ?, ?, ?, ?,
                            ?, ?, 0.00, ?,
                            0.00, 0.00, 0.00, 0.00,
                            ?, ?, 0.00, ?,
                            'AWAITING_DISBURSEMENT', NOW(3), NOW(3)
                        )
                    ");
                    $insLoan->execute([
                        $loanAccNo,
                        $app['id'],
                        $app['clientId'],
                        $app['productId'],
                        $principal,
                        $rate,
                        $method,
                        $freq,
                        $termMonths,
                        $totalInterest,
                        $totalRepayment,
                        $principal,
                        $totalInterest,
                        $totalRepayment,
                    ]);

                    $pdo->commit();
                    $success = "Loan application for {$app['clientName']} approved for " . formatCurrency($principal) . ". Ready for disbursement!";
                } else {
                    $updApp = $pdo->prepare("
                        UPDATE loanapplication SET 
                            status = 'REJECTED',
                            rejectionReason = ?,
                            reviewedByUserId = ?,
                            reviewedAt = NOW(3),
                            updatedAt = NOW(3)
                        WHERE id = ?
                    ");
                    $updApp->execute([$comments ?: 'Application rejected', $user['id'], $app['id']]);
                    $pdo->commit();
                    $success = "Loan application for {$app['clientName']} has been rejected.";
                }
            } catch (Exception $e) {
                $pdo->rollBack();
                $error = "Error reviewing application: " . $e->getMessage();
            }
        }
    }
}

// Handle Creating New Loan Application
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['create_application'])) {
    $clientId = intval($_POST['client_id'] ?? 0);
    $productId = intval($_POST['product_id'] ?? 0);
    $amount = floatval($_POST['requested_amount'] ?? 0);
    $term = intval($_POST['term_months'] ?? 6);
    $purpose = trim($_POST['purpose'] ?? 'Working capital');

    if ($clientId <= 0 || $productId <= 0 || $amount <= 0) {
        $error = 'Please select a valid client, loan product, and enter a positive loan amount.';
    } else {
        $appNo = 'APP-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
        try {
            $stmt = $pdo->prepare("
                INSERT INTO loanapplication (
                    applicationNumber, clientId, productId, branchId, requestedAmount,
                    requestedTermMonths, loanPurpose, status, createdByUserId, createdAt, updatedAt
                ) VALUES (
                    ?, ?, ?, 1, ?,
                    ?, ?, 'SUBMITTED', ?, NOW(3), NOW(3)
                )
            ");
            $stmt->execute([$appNo, $clientId, $productId, $amount, $term, $purpose, $user['id']]);
            $success = "Loan application {$appNo} successfully submitted for " . formatCurrency($amount) . ". Awaiting Super Admin review.";
        } catch (Exception $e) {
            $error = "Error submitting application: " . $e->getMessage();
        }
    }
}

// Fetch Clients & Products for Form
$clients = $pdo->query("SELECT id, fullName, clientId, phone, communityTown FROM client WHERE status = 'ACTIVE' ORDER BY fullName ASC")->fetchAll();
$products = $pdo->query("SELECT id, name, code, defaultInterestRate FROM loanproduct WHERE isActive = 1 ORDER BY name ASC")->fetchAll();

// Fetch Applications
$applications = $pdo->query("
    SELECT a.*, c.fullName AS clientName, c.clientId AS clientCode, c.phone AS clientPhone, c.communityTown, p.name AS productName
    FROM loanapplication a
    JOIN client c ON a.clientId = c.id
    JOIN loanproduct p ON a.productId = p.id
    ORDER BY a.createdAt DESC
")->fetchAll();
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

<!-- Top Action Header -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight">Loan Applications & Approvals</h2>
        <p class="text-xs text-slate-500">Staff submit applications; Super Administrator determines and approves the loan amount</p>
    </div>

    <button type="button" onclick="document.getElementById('newAppModal').classList.remove('hidden')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2 self-start">
        <i data-lucide="plus-circle" class="w-4 h-4"></i>
        <span>New Loan Application</span>
    </button>
</div>

<!-- ========================================== -->
<!-- APPLICATIONS TABLE -->
<!-- ========================================== -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="file-text" class="w-5 h-5 text-indigo-600"></i>
                <span>Application Requests Registry</span>
            </h3>
            <p class="text-xs text-slate-500">Review status, requested principal, and executive approvals</p>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
            <?= count($applications) ?> Total Applications
        </span>
    </div>

    <?php if (empty($applications)): ?>
    <div class="p-12 text-center text-slate-400">
        <i data-lucide="folder-open" class="w-12 h-12 mx-auto text-slate-300 mb-2"></i>
        <p class="text-sm font-semibold">No loan applications recorded yet.</p>
        <p class="text-xs text-slate-400 mt-1">Click "New Loan Application" to initiate a facility request.</p>
    </div>
    <?php else: ?>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">App # / Date</th>
                    <th class="pb-3">Customer Details</th>
                    <th class="pb-3">Product / Term</th>
                    <th class="pb-3">Status</th>
                    <th class="pb-3 text-right">Requested Amount</th>
                    <th class="pb-3 text-right">Super Admin Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($applications as $app): 
                    $isPending = in_array($app['status'], ['SUBMITTED', 'UNDER_REVIEW', 'DRAFT']);
                    $isApproved = ($app['status'] === 'APPROVED');
                ?>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($app['applicationNumber']) ?></div>
                        <div class="text-[11px] text-slate-400"><?= formatDate($app['createdAt']) ?></div>
                    </td>
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($app['clientName']) ?></div>
                        <div class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($app['clientCode']) ?> &bull; <?= htmlspecialchars($app['communityTown'] ?? 'Wassa Powuako') ?></div>
                    </td>
                    <td class="py-3">
                        <div class="font-semibold text-slate-800"><?= htmlspecialchars($app['productName']) ?></div>
                        <div class="text-[11px] text-slate-500"><?= $app['requestedTermMonths'] ?> Months</div>
                    </td>
                    <td class="py-3">
                        <?php if ($isApproved): ?>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Approved</span>
                        <?php elseif ($app['status'] === 'REJECTED'): ?>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">Rejected</span>
                        <?php else: ?>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">Pending Review</span>
                        <?php endif; ?>
                    </td>
                    <td class="py-3 text-right font-black text-slate-900 text-base">
                        <?= formatCurrency($app['requestedAmount']) ?>
                    </td>
                    <td class="py-3 text-right">
                        <?php if ($isPending && isCeoOrSuperAdmin()): ?>
                            <button type="button" onclick="openReviewModal(<?= htmlspecialchars(json_encode($app)) ?>)" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition">
                                Review & Approve
                            </button>
                        <?php elseif ($isApproved): ?>
                            <a href="disbursements.php" class="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                                Disburse &rarr;
                            </a>
                        <?php else: ?>
                            <span class="text-xs text-slate-400 font-semibold">—</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- ========================================== -->
<!-- MODAL: REVIEW & APPROVE (SUPER ADMIN) -->
<!-- ========================================== -->
<div id="reviewModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="shield-check" class="w-5 h-5 text-emerald-600"></i>
                <span>Super Admin Loan Determination</span>
            </h3>
            <button type="button" onclick="document.getElementById('reviewModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <form method="POST" action="loans.php" class="space-y-4">
            <input type="hidden" name="review_application" value="1">
            <input type="hidden" name="app_id" id="reviewAppId" value="">

            <div>
                <div class="text-xs text-slate-500">Applicant:</div>
                <div id="reviewClientName" class="text-sm font-bold text-slate-900"></div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Approved Principal Amount (GH₵)</label>
                <div class="relative">
                    <span class="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">GH₵</span>
                    <input type="number" step="0.01" min="100" id="reviewApprovedAmount" name="approved_amount" required class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Super Administrator determines the final approved sum to disburse.</p>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Decision</label>
                <select name="decision" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="APPROVED">Approve Application</option>
                    <option value="REJECTED">Reject Application</option>
                </select>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Executive Notes (Optional)</label>
                <textarea name="comments" rows="2" placeholder="Approval or rejection remarks" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" onclick="document.getElementById('reviewModal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition">
                    Save Determination
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ========================================== -->
<!-- MODAL: NEW APPLICATION -->
<!-- ========================================== -->
<div id="newAppModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 class="text-base font-extrabold text-slate-900">New Loan Application</h3>
            <button type="button" onclick="document.getElementById('newAppModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <form method="POST" action="loans.php" class="space-y-4">
            <input type="hidden" name="create_application" value="1">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Client</label>
                <select name="client_id" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">-- Choose Client --</option>
                    <?php foreach ($clients as $c): ?>
                    <option value="<?= $c['id'] ?>">
                        <?= htmlspecialchars($c['fullName']) ?> (<?= $c['clientId'] ?>) &bull; <?= htmlspecialchars($c['communityTown']) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Loan Product</label>
                    <select name="product_id" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <?php foreach ($products as $p): ?>
                        <option value="<?= $p['id'] ?>">
                            <?= htmlspecialchars($p['name']) ?> (<?= $p['defaultInterestRate'] ?>%)
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Requested Amount (GH₵)</label>
                    <input type="number" step="0.01" min="100" name="requested_amount" required placeholder="5000.00" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Term (Months)</label>
                    <input type="number" min="1" max="24" name="term_months" value="6" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Loan Purpose</label>
                    <input type="text" name="purpose" value="Working capital expansion" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" onclick="document.getElementById('newAppModal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition">
                    Submit Application
                </button>
            </div>
        </form>
    </div>
</div>

<script>
function openReviewModal(app) {
    document.getElementById('reviewAppId').value = app.id;
    document.getElementById('reviewClientName').innerText = `${app.clientName} (${app.clientCode}) — Requested: GH₵ ${parseFloat(app.requestedAmount).toFixed(2)}`;
    document.getElementById('reviewApprovedAmount').value = parseFloat(app.requestedAmount).toFixed(2);
    document.getElementById('reviewModal').classList.remove('hidden');
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>


<?php
// EL-FAITH MICROFINANCE - System Settings & Danger Zone
// 40-Day Emergency Wipeout with Continuous Audio Siren
$activePage = 'settings';
$pageTitle = 'System Settings & Controls';

require_once __DIR__ . '/includes/header.php';

$success = '';
$error = '';

// Handle Setting Updates
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_settings'])) {
    if (!isSuperAdmin()) {
        $error = 'Only Super Administrator can alter organization configurations.';
    } else {
        $settingsToUpdate = [
            'COMPANY_NAME' => $_POST['company_name'] ?? 'EL-FAITH MICROFINANCE',
            'COMPANY_BRANCH' => $_POST['company_branch'] ?? 'Wassa Powuako Branch',
            'COMPANY_PHONE' => $_POST['company_phone'] ?? '+233 24 556 7890',
            'COMPANY_EMAIL' => $_POST['company_email'] ?? 'info@elfaithmicrofinance.com',
            'TOTAL_LOAN_ALLOCATION' => $_POST['total_allocation'] ?? '500000.00',
        ];

        foreach ($settingsToUpdate as $k => $v) {
            $stmt = $pdo->prepare("REPLACE INTO systemsetting (`key`, `value`, `updatedAt`) VALUES (?, ?, NOW(3))");
            $stmt->execute([$k, $v]);
        }
        $success = 'Organization settings updated successfully.';
    }
}

// Fetch current settings
$stmt = $pdo->query("SELECT `key`, `value` FROM systemsetting");
$currentSettings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$totalAlloc = $currentSettings['TOTAL_LOAN_ALLOCATION'] ?? '500000.00';

// Wipeout status
$wipeoutScheduled = !empty($currentSettings['SYSTEM_WIPEOUT_SCHEDULED']) ? json_decode($currentSettings['SYSTEM_WIPEOUT_SCHEDULED'], true) : null;
$alarmMuted = !empty($currentSettings['SYSTEM_WIPEOUT_ALARM_MUTED']) && $currentSettings['SYSTEM_WIPEOUT_ALARM_MUTED'] === 'true';
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

<!-- Organization Settings Form -->
<div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm mb-8">
    <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="building-2" class="w-5 h-5 text-emerald-600"></i>
                <span>Institutional Branch Settings</span>
            </h3>
            <p class="text-xs text-slate-500">Core parameters for Wassa Powuako branch operations</p>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
            Active Configuration
        </span>
    </div>

    <form method="POST" action="settings.php" class="space-y-4 max-w-2xl">
        <input type="hidden" name="save_settings" value="1">

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Legal Name</label>
                <input type="text" name="company_name" value="<?= htmlspecialchars($currentSettings['COMPANY_NAME'] ?? 'EL-FAITH MICROFINANCE') ?>" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Main Branch</label>
                <input type="text" name="company_branch" value="<?= htmlspecialchars($currentSettings['COMPANY_BRANCH'] ?? 'Wassa Powuako Branch') ?>" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch Telephone</label>
                <input type="text" name="company_phone" value="<?= htmlspecialchars($currentSettings['COMPANY_PHONE'] ?? '+233 24 556 7890') ?>" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Official Email</label>
                <input type="email" name="company_email" value="<?= htmlspecialchars($currentSettings['COMPANY_EMAIL'] ?? 'info@elfaithmicrofinance.com') ?>" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
            </div>
        </div>

        <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Super Admin Total Loan Allocation Ceiling (GH₵)</label>
            <div class="relative">
                <span class="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">GH₵</span>
                <input type="number" step="0.01" min="1000" name="total_allocation" value="<?= htmlspecialchars($totalAlloc) ?>" class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Super Administrator determines the maximum funds available to lend out.</p>
        </div>

        <?php if (isSuperAdmin()): ?>
        <div class="pt-2">
            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2">
                <i data-lucide="save" class="w-4 h-4"></i>
                <span>Save System Settings</span>
            </button>
        </div>
        <?php else: ?>
        <div class="text-xs text-slate-400 italic">Settings modification is restricted to Super Administrator.</div>
        <?php endif; ?>
    </form>
</div>

<!-- ========================================== -->
<!-- DANGER ZONE: 40-DAY SYSTEM WIPEOUT PROTOCOL -->
<!-- ========================================== -->
<div class="bg-red-50 border-2 border-red-200 rounded-3xl p-6 md:p-8 shadow-sm">
    <div class="flex items-start space-x-3 mb-4">
        <div class="p-2.5 bg-red-600 text-white rounded-xl shadow-md">
            <i data-lucide="alert-octagon" class="w-6 h-6"></i>
        </div>
        <div>
            <h3 class="text-lg font-black text-red-950">Danger Zone: 40-Day Emergency Wipeout Protocol</h3>
            <p class="text-xs text-red-800 mt-0.5">
                Initiating a total wipeout arms a <strong>40-day waiting period</strong> before deletion can execute. During this entire period, an audio siren alarm sounds continuously until stopped by the Super Administrator.
            </p>
        </div>
    </div>

    <?php if ($wipeoutScheduled): ?>
    <div class="bg-white border border-red-300 rounded-2xl p-5 mb-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                <span class="text-xs font-black uppercase text-red-700 tracking-wider">Wipeout Currently Armed</span>
            </div>
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full <?= $alarmMuted ? 'bg-slate-200 text-slate-700' : 'bg-red-600 text-white' ?>">
                <?= $alarmMuted ? 'Audio Siren Stopped' : 'Audio Siren Beeping' ?>
            </span>
        </div>
        <div class="text-xs text-slate-600 space-y-1">
            <div>Scheduled Execution: <strong class="text-slate-900"><?= htmlspecialchars(date('d M Y, h:i A', strtotime($wipeoutScheduled['executeAt']))) ?></strong> (40-Day Buffer)</div>
            <div>Authorized By: <strong><?= htmlspecialchars($wipeoutScheduled['scheduledBy']) ?></strong></div>
            <div>Reason: <em><?= htmlspecialchars($wipeoutScheduled['reason']) ?></em></div>
        </div>

        <?php if (isSuperAdmin()): ?>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-3">
            <button type="button" onclick="stopWipeoutAlarm()" class="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5">
                <i data-lucide="volume-x" class="w-4 h-4"></i>
                <span>Stop Continuous Audio Siren</span>
            </button>
            <button type="button" onclick="cancelWipeout()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
                <span>Abort & Cancel Wipeout</span>
            </button>
        </div>
        <?php endif; ?>
    </div>
    <?php else: ?>
        <?php if (isSuperAdmin()): ?>
        <div class="bg-white border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <div class="text-sm font-bold text-slate-900">Arm Total System Wipeout</div>
                <div class="text-xs text-slate-500">Requires 40 days to take effect. Continuous alarm will sound immediately upon arming.</div>
            </div>
            <button type="button" onclick="triggerWipeoutSchedule()" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/30 transition flex items-center space-x-2 self-start sm:self-auto">
                <i data-lucide="skull" class="w-4 h-4"></i>
                <span>Initiate 40-Day Wipeout</span>
            </button>
        </div>
        <?php else: ?>
        <div class="text-xs text-red-700 font-semibold italic">
            Only the Super Administrator has authorization to trigger the emergency wipeout protocol.
        </div>
        <?php endif; ?>
    <?php endif; ?>
</div>

<script>
function triggerWipeoutSchedule() {
    const confirmation = prompt('WARNING: You are about to initiate a complete system wipeout with a 40-day countdown buffer and continuous audio alarm. Type "WIPEOUT" to confirm:');
    if (confirmation !== 'WIPEOUT') {
        alert('Wipeout canceled: Confirmation text did not match.');
        return;
    }

    const reason = prompt('Please enter the reason for scheduling the wipeout:', 'Super Administrator initiated reset');
    const formData = new FormData();
    formData.append('action', 'schedule');
    formData.append('reason', reason || 'Super Administrator reset');

    fetch('api_wipeout.php', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert('40-day wipeout successfully armed. Siren alarm activated.');
            window.location.reload();
        } else {
            alert(data.message || 'Error arming wipeout');
        }
    });
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

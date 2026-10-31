<?php
// EL-FAITH MICROFINANCE - Sidebar Navigation
$role = $user['role'] ?? '';
$isAdmin = ($role === ROLE_SUPER_ADMIN);
$isExec = ($role === ROLE_SUPER_ADMIN || $role === ROLE_CEO);
?>
<aside class="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col border-r border-slate-800">
    <!-- Brand Header -->
    <div class="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg">
            EF
        </div>
        <div>
            <div class="font-extrabold text-white text-base tracking-tight leading-none"><?= APP_NAME ?></div>
            <div class="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider mt-1">Wassa Powuako, Ghana</div>
        </div>
    </div>

    <!-- Nav Links -->
    <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Operations</div>
        
        <a href="dashboard.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
            <span>Dashboard</span>
        </a>

        <a href="repayments.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'repayments' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="wallet" class="w-4 h-4"></i>
            <span>Loan Repayments</span>
            <span class="ml-auto text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Staff</span>
        </a>

        <a href="loans.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'loans' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>Loan Applications</span>
        </a>

        <a href="disbursements.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'disbursements' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="badge-dollar-sign" class="w-4 h-4"></i>
            <span>Disbursements</span>
        </a>

        <a href="clients.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'clients' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span>Client Directory</span>
        </a>

        <a href="calculator.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'calculator' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="calculator" class="w-4 h-4"></i>
            <span>Loan Calculator</span>
        </a>

        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-4 mb-2">Administration</div>

        <?php if ($isAdmin): ?>
        <a href="staff.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'staff' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="user-check" class="w-4 h-4"></i>
            <span>Staff Management</span>
            <span class="ml-auto text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-bold">Admin</span>
        </a>
        <?php endif; ?>

        <a href="settings.php" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition <?= $activePage === 'settings' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white' ?>">
            <i data-lucide="settings" class="w-4 h-4"></i>
            <span>System Settings</span>
        </a>
    </nav>

    <!-- Super Admin Active Status -->
    <div class="p-4 border-t border-slate-800 bg-slate-950/50">
        <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
            </div>
            <div class="overflow-hidden">
                <div class="text-xs font-bold text-white truncate"><?= htmlspecialchars($user['fullName'] ?? $user['username']) ?></div>
                <div class="text-[10px] text-emerald-400 truncate"><?= htmlspecialchars($user['role']) ?></div>
            </div>
        </div>
    </div>
</aside>

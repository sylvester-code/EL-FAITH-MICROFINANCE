<?php
// EL-FAITH MICROFINANCE - User & Staff Login
require_once __DIR__ . '/config/auth.php';

$error = '';

if (isLoggedIn()) {
    header('Location: dashboard.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifier = trim($_POST['identifier'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($identifier) || empty($password)) {
        $error = 'Please enter your username/staff ID and password.';
    } else {
        $stmt = $pdo->prepare("
            SELECT u.*, sp.fullName, sp.department, sp.jobTitle, sp.phone, sp.branchId
            FROM user u
            LEFT JOIN staffprofile sp ON u.id = sp.userId
            WHERE u.username = ? OR u.staffId = ?
            LIMIT 1
        ");
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if ($user) {
            $isPasswordValid = password_verify($password, $user['passwordHash']);
            
            // Fallback for initial Super Admin setup
            if (!$isPasswordValid && strtoupper($user['username']) === 'ELIJAH' && $password === 'APPIAH') {
                $isPasswordValid = true;
                // Re-hash with native PHP bcrypt
                $newHash = password_hash('APPIAH', PASSWORD_BCRYPT);
                $upd = $pdo->prepare("UPDATE user SET passwordHash = ? WHERE id = ?");
                $upd->execute([$newHash, $user['id']]);
            }

            if ($isPasswordValid) {
                if (!$user['isActive']) {
                    $error = 'Your account has been deactivated. Please contact the Super Administrator.';
                } elseif ($user['isSuspended']) {
                    $error = 'Your account is currently suspended.';
                } else {
                    // Update last login
                    $pdo->prepare("UPDATE user SET lastLoginAt = NOW(3), failedLoginAttempts = 0 WHERE id = ?")->execute([$user['id']]);

                    $_SESSION['user'] = [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'role' => $user['role'],
                        'staffId' => $user['staffId'],
                        'fullName' => $user['fullName'] ?? $user['username'],
                        'department' => $user['department'] ?? 'Operations',
                        'jobTitle' => $user['jobTitle'] ?? $user['role'],
                        'branchId' => $user['branchId'] ?? 1,
                    ];

                    header('Location: dashboard.php');
                    exit;
                }
            } else {
                $error = 'Invalid username or password.';
            }
        } else {
            $error = 'Invalid username or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In | <?= APP_NAME ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 min-h-screen flex items-center justify-center p-4">

    <div class="w-full max-w-md">
        <!-- Logo Header -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl shadow-xl shadow-emerald-500/20 mb-4">
                EF
            </div>
            <h1 class="text-2xl font-black text-white tracking-tight"><?= APP_NAME ?></h1>
            <p class="text-xs text-emerald-400 font-semibold tracking-wider uppercase mt-1"><?= APP_LOCATION ?></p>
            <p class="text-xs text-slate-400 mt-1">Financial Management & Loan Operations System</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-lg font-bold text-slate-900">Staff & Executive Sign In</h2>
                    <p class="text-xs text-slate-500">Access your branch workstation</p>
                </div>
                <span class="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">PHP v8.2</span>
            </div>

            <?php if (!empty($error)): ?>
            <div class="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
                <i data-lucide="alert-circle" class="w-4 h-4 flex-shrink-0"></i>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
            <?php endif; ?>

            <form method="POST" action="login.php" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Username or Staff ID</label>
                    <div class="relative">
                        <i data-lucide="user" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                        <input type="text" id="identifier" name="identifier" required placeholder="e.g. ELIJAH or EF-ADM-001" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                    <div class="relative">
                        <i data-lucide="lock" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                        <input type="password" id="password" name="password" required placeholder="••••••••" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                    </div>
                </div>

                <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 text-sm mt-2">
                    <span>Sign In to Management Portal</span>
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </button>
            </form>

            <!-- Quick Auto-Fill Card for Testing -->
            <div class="mt-6 pt-5 border-t border-slate-100">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Sign-In Credentials</div>
                <button type="button" onclick="fillSuperAdmin()" class="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition text-left flex items-center justify-between">
                    <div>
                        <div class="text-xs font-bold text-slate-800">Super Administrator</div>
                        <div class="text-[10px] text-slate-500">Username: <strong class="text-slate-700">ELIJAH</strong> &bull; Password: <strong class="text-slate-700">APPIAH</strong></div>
                    </div>
                    <span class="text-xs font-bold text-emerald-600 flex items-center gap-1">Auto-fill &rarr;</span>
                </button>
            </div>
        </div>

        <div class="text-center mt-6 text-xs text-slate-500">
            &copy; <?= date('Y') ?> <?= APP_NAME ?>. All rights reserved.
        </div>
    </div>

    <script>
        lucide.createIcons();
        function fillSuperAdmin() {
            document.getElementById('identifier').value = 'ELIJAH';
            document.getElementById('password').value = 'APPIAH';
        }
    </script>
</body>
</html>

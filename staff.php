<?php
// EL-FAITH MICROFINANCE - Staff Management & Deletion Controls
// Restricted to Super Administrator
require_once __DIR__ . '/config/auth.php';
requireSuperAdmin();

$activePage = 'staff';
$pageTitle = 'Staff Management & Workforce';

require_once __DIR__ . '/includes/header.php';

$success = '';
$error = '';

// Handle Staff Deletion (Super Admin Only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_staff'])) {
    $targetUserId = intval($_POST['user_id'] ?? 0);

    if ($targetUserId <= 0) {
        $error = 'Invalid staff member selected.';
    } elseif ($targetUserId === intval($user['id'])) {
        $error = 'Security Protection: Super Administrator cannot delete their own active account.';
    } else {
        // Fetch target user
        $stmt = $pdo->prepare("SELECT u.*, sp.fullName FROM user u LEFT JOIN staffprofile sp ON u.id = sp.userId WHERE u.id = ?");
        $stmt->execute([$targetUserId]);
        $targetUser = $stmt->fetch();

        if (!$targetUser) {
            $error = 'Staff member not found.';
        } elseif ($targetUser['role'] === ROLE_SUPER_ADMIN) {
            $error = 'Super Administrator accounts cannot be deleted.';
        } else {
            try {
                $pdo->beginTransaction();

                // 1. Unlink foreign key references to prevent constraint violation
                $pdo->prepare("UPDATE client SET assignedOfficerId = NULL WHERE assignedOfficerId = ?")->execute([$targetUserId]);
                $pdo->prepare("UPDATE client SET createdByUserId = NULL WHERE createdByUserId = ?")->execute([$targetUserId]);
                $pdo->prepare("UPDATE loan SET assignedOfficerId = NULL WHERE assignedOfficerId = ?")->execute([$targetUserId]);
                $pdo->prepare("UPDATE loanapplication SET assignedOfficerId = NULL WHERE assignedOfficerId = ?")->execute([$targetUserId]);

                // 2. Delete Staff Profile
                $pdo->prepare("DELETE FROM staffprofile WHERE userId = ?")->execute([$targetUserId]);

                // 3. Delete User
                $pdo->prepare("DELETE FROM user WHERE id = ?")->execute([$targetUserId]);

                $pdo->commit();
                $success = "Staff member '{$targetUser['username']}' (" . ($targetUser['fullName'] ?: 'Staff') . ") has been permanently deleted.";
            } catch (Exception $e) {
                $pdo->rollBack();
                $error = "Error deleting staff member: " . $e->getMessage();
            }
        }
    }
}

// Handle Add New Staff
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_staff'])) {
    $fullName = trim($_POST['full_name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $role = $_POST['role'] ?? ROLE_LOAN_OFFICER;
    $phone = trim($_POST['phone'] ?? '');
    $department = trim($_POST['department'] ?? 'Operations');
    $jobTitle = trim($_POST['job_title'] ?? 'Staff Officer');

    if (empty($fullName) || empty($username) || empty($password)) {
        $error = 'Full name, username, and password are required.';
    } else {
        // Check uniqueness
        $check = $pdo->prepare("SELECT id FROM user WHERE username = ? OR email = ?");
        $check->execute([$username, $email ?: ($username . '@elfaith.com')]);
        if ($check->fetch()) {
            $error = "A user with that username or email already exists.";
        } else {
            try {
                $pdo->beginTransaction();

                $staffId = 'EF-' . strtoupper(substr($role, 0, 3)) . '-' . rand(100, 999);
                $passwordHash = password_hash($password, PASSWORD_BCRYPT);
                $userEmail = !empty($email) ? $email : strtolower($username) . '@elfaith.com';

                $insUser = $pdo->prepare("
                    INSERT INTO user (username, email, passwordHash, role, staffId, isActive, createdAt)
                    VALUES (?, ?, ?, ?, ?, 1, NOW(3))
                ");
                $insUser->execute([$username, $userEmail, $passwordHash, $role, $staffId]);
                $newUserId = $pdo->lastInsertId();

                $insProf = $pdo->prepare("
                    INSERT INTO staffprofile (userId, fullName, phone, department, jobTitle, branchId, createdAt)
                    VALUES (?, ?, ?, ?, ?, 1, NOW(3))
                ");
                $insProf->execute([$newUserId, $fullName, $phone ?: '+233 24 000 0000', $department, $jobTitle]);

                $pdo->commit();
                $success = "New staff member {$fullName} ({$username}) created with role {$role} (Staff ID: {$staffId}).";
            } catch (Exception $e) {
                $pdo->rollBack();
                $error = "Error adding staff: " . $e->getMessage();
            }
        }
    }
}

// Fetch All Staff
$staffListStmt = $pdo->query("
    SELECT 
        u.id, u.username, u.email, u.role, u.staffId, u.isActive, u.createdAt, u.lastLoginAt,
        sp.fullName, sp.phone, sp.department, sp.jobTitle
    FROM user u
    LEFT JOIN staffprofile sp ON u.id = sp.userId
    ORDER BY u.id ASC
");
$staffList = $staffListStmt->fetchAll();
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

<!-- Header with Action -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight">Staff Management & Personnel Controls</h2>
        <p class="text-xs text-slate-500">Super Administrator controls to add new staff and permanently delete staff profiles</p>
    </div>

    <button type="button" onclick="document.getElementById('addStaffModal').classList.remove('hidden')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2 self-start">
        <i data-lucide="user-plus" class="w-4 h-4"></i>
        <span>Add New Staff Member</span>
    </button>
</div>

<!-- ========================================== -->
<!-- STAFF DIRECTORY TABLE -->
<!-- ========================================== -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="users" class="w-5 h-5 text-indigo-600"></i>
                <span>Active Branch Workforce (Wassa Powuako)</span>
            </h3>
            <p class="text-xs text-slate-500">All registered system users and field collection personnel</p>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
            <?= count($staffList) ?> Staff Members
        </span>
    </div>

    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">Name & Username</th>
                    <th class="pb-3">Role</th>
                    <th class="pb-3">Staff ID</th>
                    <th class="pb-3">Department & Title</th>
                    <th class="pb-3">Phone</th>
                    <th class="pb-3 text-right">Super Admin Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($staffList as $s): 
                    $isSelf = (intval($s['id']) === intval($user['id']));
                    $isSuper = ($s['role'] === ROLE_SUPER_ADMIN);
                ?>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3">
                        <div class="font-bold text-slate-900 flex items-center space-x-2">
                            <span><?= htmlspecialchars($s['fullName'] ?: $s['username']) ?></span>
                            <?php if ($isSelf): ?>
                                <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">You</span>
                            <?php endif; ?>
                        </div>
                        <div class="text-[11px] text-slate-400">@<?= htmlspecialchars($s['username']) ?> &bull; <?= htmlspecialchars($s['email']) ?></div>
                    </td>
                    <td class="py-3">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full <?= $isSuper ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700' ?>">
                            <?= htmlspecialchars(str_replace('_', ' ', $s['role'])) ?>
                        </span>
                    </td>
                    <td class="py-3 font-mono text-xs text-slate-600 font-semibold"><?= htmlspecialchars($s['staffId'] ?? '—') ?></td>
                    <td class="py-3">
                        <div class="text-xs font-semibold text-slate-800"><?= htmlspecialchars($s['jobTitle'] ?? 'Staff') ?></div>
                        <div class="text-[11px] text-slate-400"><?= htmlspecialchars($s['department'] ?? 'Operations') ?></div>
                    </td>
                    <td class="py-3 font-mono text-xs text-slate-600"><?= htmlspecialchars($s['phone'] ?? '—') ?></td>
                    <td class="py-3 text-right">
                        <?php if ($isSuper || $isSelf): ?>
                            <span class="text-xs font-semibold text-slate-400 italic">Protected</span>
                        <?php else: ?>
                            <form method="POST" action="staff.php" onsubmit="return confirm('Are you sure you want to permanently delete staff member <?= htmlspecialchars($s['fullName'] ?: $s['username']) ?>? This action cannot be undone.');" class="inline">
                                <input type="hidden" name="delete_staff" value="1">
                                <input type="hidden" name="user_id" value="<?= $s['id'] ?>">
                                <button type="submit" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition" title="Delete Staff Member">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </form>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ========================================== -->
<!-- MODAL: ADD NEW STAFF -->
<!-- ========================================== -->
<div id="addStaffModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="user-plus" class="w-5 h-5 text-emerald-600"></i>
                <span>Register New Staff Member</span>
            </h3>
            <button type="button" onclick="document.getElementById('addStaffModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <form method="POST" action="staff.php" class="space-y-4">
            <input type="hidden" name="add_staff" value="1">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Legal Name</label>
                <input type="text" name="full_name" required placeholder="e.g. Kwabena Mensah" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username</label>
                    <input type="text" name="username" required placeholder="e.g. kwabena_m" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Temporary Password</label>
                    <input type="password" name="password" required placeholder="••••••••" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role</label>
                    <select name="role" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="LOAN_OFFICER">Loan Officer (Collector)</option>
                        <option value="CASHIER">Cashier (Teller)</option>
                        <option value="BRANCH_MANAGER">Branch Manager</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="AUDITOR">Auditor</option>
                        <option value="CUSTOMER_SERVICE">Customer Service</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                    <input type="text" name="phone" placeholder="e.g. 0244123456" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Department</label>
                    <input type="text" name="department" value="Credit Operations" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Job Title</label>
                    <input type="text" name="job_title" value="Field Loan Officer" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" onclick="document.getElementById('addStaffModal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition">
                    Create Staff Account
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>


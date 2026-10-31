<?php
// EL-FAITH MICROFINANCE - Client Directory & Registration
// Location: Wassa Powuako, Western Region, Ghana
$activePage = 'clients';
$pageTitle = 'Client Directory & Registration';

require_once __DIR__ . '/includes/header.php';

$success = '';
$error = '';

// Handle New Client Registration
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['register_client'])) {
    $fullName = trim($_POST['full_name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $town = trim($_POST['community_town'] ?? 'Wassa Powuako');
    $ghanaCard = trim($_POST['ghana_card'] ?? '');
    $address = trim($_POST['residential_address'] ?? 'Wassa Powuako');
    $occupation = trim($_POST['occupation'] ?? 'Trader');
    $kinName = trim($_POST['next_of_kin_name'] ?? '');
    $kinPhone = trim($_POST['next_of_kin_phone'] ?? '');
    $kinRelation = trim($_POST['next_of_kin_relation'] ?? 'Spouse');

    if (empty($fullName) || empty($phone) || empty($ghanaCard)) {
        $error = 'Full name, phone number, and Ghana Card number are required.';
    } else {
        // Check uniqueness of Ghana card
        $chk = $pdo->prepare("SELECT id FROM client WHERE ghanaCardNumber = ?");
        $chk->execute([$ghanaCard]);
        if ($chk->fetch()) {
            $error = 'A client with that Ghana Card Number is already registered.';
        } else {
            $clientId = 'EF-CL-' . date('ym') . '-' . rand(1000, 9999);
            try {
                $ins = $pdo->prepare("
                    INSERT INTO client (
                        clientId, fullName, phone, communityTown, ghanaCardNumber,
                        residentialAddress, occupation, nextOfKinName, nextOfKinPhone,
                        nextOfKinRelation, status, branchId, createdByUserId, createdAt, updatedAt
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, 'ACTIVE', 1, ?, NOW(3), NOW(3)
                    )
                ");
                $ins->execute([
                    $clientId, $fullName, $phone, $town, $ghanaCard,
                    $address, $occupation, $kinName ?: 'N/A', $kinPhone ?: 'N/A',
                    $kinRelation, $user['id']
                ]);
                $success = "Client {$fullName} successfully registered with Client ID {$clientId}.";
            } catch (Exception $e) {
                $error = "Registration error: " . $e->getMessage();
            }
        }
    }
}

// Fetch Clients
$search = trim($_GET['search'] ?? '');
if (!empty($search)) {
    $stmt = $pdo->prepare("
        SELECT c.*, COUNT(l.id) AS activeLoansCount
        FROM client c
        LEFT JOIN loan l ON c.id = l.clientId AND l.status IN ('ACTIVE', 'DISBURSED', 'OVERDUE')
        WHERE c.fullName LIKE ? OR c.clientId LIKE ? OR c.phone LIKE ? OR c.ghanaCardNumber LIKE ?
        GROUP BY c.id
        ORDER BY c.createdAt DESC
    ");
    $term = "%{$search}%";
    $stmt->execute([$term, $term, $term, $term]);
    $clients = $stmt->fetchAll();
} else {
    $clients = $pdo->query("
        SELECT c.*, COUNT(l.id) AS activeLoansCount
        FROM client c
        LEFT JOIN loan l ON c.id = l.clientId AND l.status IN ('ACTIVE', 'DISBURSED', 'OVERDUE')
        GROUP BY c.id
        ORDER BY c.createdAt DESC
    ")->fetchAll();
}
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
        <h2 class="text-xl font-black text-slate-900 tracking-tight">Client Directory & Borrowers</h2>
        <p class="text-xs text-slate-500">Register local entrepreneurs, traders, farmers, and community members in Wassa Powuako</p>
    </div>

    <button type="button" onclick="document.getElementById('newClientModal').classList.remove('hidden')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2 self-start">
        <i data-lucide="user-plus" class="w-4 h-4"></i>
        <span>Register New Client</span>
    </button>
</div>

<!-- Search Bar -->
<div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
    <form method="GET" action="clients.php" class="flex items-center gap-3">
        <div class="relative flex-1">
            <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-3 text-slate-400"></i>
            <input type="text" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search by name, Client ID (EF-CL-...), Ghana Card, or phone number..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
        </div>
        <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition">
            Search
        </button>
        <?php if (!empty($search)): ?>
            <a href="clients.php" class="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition">
                Clear
            </a>
        <?php endif; ?>
    </form>
</div>

<!-- Clients Table -->
<div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="contact" class="w-5 h-5 text-emerald-600"></i>
                <span>Registered Borrowers (<?= count($clients) ?>)</span>
            </h3>
        </div>
    </div>

    <?php if (empty($clients)): ?>
    <div class="p-12 text-center text-slate-400">
        <i data-lucide="users" class="w-12 h-12 mx-auto text-slate-300 mb-2"></i>
        <p class="text-sm font-semibold">No clients found matching your search.</p>
    </div>
    <?php else: ?>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
            <thead>
                <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th class="pb-3">Client Code / Name</th>
                    <th class="pb-3">Community / Town</th>
                    <th class="pb-3">Phone & Ghana Card</th>
                    <th class="pb-3">Occupation</th>
                    <th class="pb-3">Active Loans</th>
                    <th class="pb-3 text-right">Registered</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($clients as $c): ?>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3">
                        <div class="font-bold text-slate-900"><?= htmlspecialchars($c['fullName']) ?></div>
                        <div class="text-[11px] text-slate-500 font-mono font-semibold"><?= htmlspecialchars($c['clientId']) ?></div>
                    </td>
                    <td class="py-3">
                        <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                            <?= htmlspecialchars($c['communityTown'] ?? 'Wassa Powuako') ?>
                        </span>
                    </td>
                    <td class="py-3 font-mono text-xs text-slate-700">
                        <div><?= htmlspecialchars($c['phone']) ?></div>
                        <div class="text-[11px] text-slate-400"><?= htmlspecialchars($c['ghanaCardNumber']) ?></div>
                    </td>
                    <td class="py-3 text-xs text-slate-600 font-medium"><?= htmlspecialchars($c['occupation'] ?? '—') ?></td>
                    <td class="py-3">
                        <?php if ($c['activeLoansCount'] > 0): ?>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <?= $c['activeLoansCount'] ?> Active
                            </span>
                        <?php else: ?>
                            <span class="text-xs text-slate-400 font-medium">None</span>
                        <?php endif; ?>
                    </td>
                    <td class="py-3 text-right text-xs text-slate-400"><?= formatDate($c['createdAt']) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- ========================================== -->
<!-- MODAL: REGISTER NEW CLIENT -->
<!-- ========================================== -->
<div id="newClientModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="user-plus" class="w-5 h-5 text-emerald-600"></i>
                <span>Register New Borrower Client</span>
            </h3>
            <button type="button" onclick="document.getElementById('newClientModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <form method="POST" action="clients.php" class="space-y-4">
            <input type="hidden" name="register_client" value="1">

            <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Legal Name</label>
                    <input type="text" name="full_name" required placeholder="e.g. Yaw Boateng" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                    <input type="text" name="phone" required placeholder="0244123456" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ghana Card Number</label>
                    <input type="text" name="ghana_card" required placeholder="GHA-123456789-0" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Community / Town</label>
                    <input type="text" name="community_town" value="Wassa Powuako" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Occupation / Trade</label>
                    <input type="text" name="occupation" value="Cocoa Farmer / Trader" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>

                <div class="col-span-2">
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Residential Address</label>
                    <input type="text" name="residential_address" value="Next to Central Mosque, Wassa Powuako" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
            </div>

            <div class="pt-2 border-t border-slate-100">
                <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Next of Kin Details</div>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <input type="text" name="next_of_kin_name" placeholder="Full Name" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white">
                    </div>
                    <div>
                        <input type="text" name="next_of_kin_phone" placeholder="Phone Number" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white">
                    </div>
                    <div>
                        <input type="text" name="next_of_kin_relation" placeholder="Relation (Spouse/Sibling)" value="Spouse" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white">
                    </div>
                </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" onclick="document.getElementById('newClientModal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition">
                    Save Client Profile
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>


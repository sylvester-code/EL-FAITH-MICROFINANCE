<?php
// EL-FAITH MICROFINANCE - 40-Day Wipeout Protocol API Endpoint
header('Content-Type: application/json');

require_once __DIR__ . '/config/auth.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$user = getCurrentUser();

if ($action === 'status') {
    $stmt = $pdo->prepare("SELECT `key`, `value` FROM systemsetting WHERE `key` IN ('SYSTEM_WIPEOUT_SCHEDULED', 'SYSTEM_WIPEOUT_ALARM_MUTED')");
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $wipeout = !empty($settings['SYSTEM_WIPEOUT_SCHEDULED']) ? json_decode($settings['SYSTEM_WIPEOUT_SCHEDULED'], true) : null;
    $alarmMuted = !empty($settings['SYSTEM_WIPEOUT_ALARM_MUTED']) && $settings['SYSTEM_WIPEOUT_ALARM_MUTED'] === 'true';

    echo json_encode([
        'success' => true,
        'wipeoutActive' => !empty($wipeout['scheduled']),
        'wipeout' => $wipeout,
        'alarmMuted' => $alarmMuted,
    ]);
    exit;
}

// Protected actions requiring Super Admin
if (!isSuperAdmin()) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Super Admin required']);
    exit;
}

if ($action === 'stop_alarm') {
    $stmt = $pdo->prepare("REPLACE INTO systemsetting (`key`, `value`, `updatedAt`) VALUES ('SYSTEM_WIPEOUT_ALARM_MUTED', 'true', NOW(3))");
    $stmt->execute();
    echo json_encode(['success' => true, 'message' => 'Audio siren alarm stopped by Super Administrator']);
    exit;
}

if ($action === 'cancel') {
    $stmt = $pdo->prepare("DELETE FROM systemsetting WHERE `key` IN ('SYSTEM_WIPEOUT_SCHEDULED', 'SYSTEM_WIPEOUT_ALARM_MUTED')");
    $stmt->execute();
    echo json_encode(['success' => true, 'message' => 'Emergency wipeout protocol canceled. Normal operations restored.']);
    exit;
}

if ($action === 'schedule') {
    $now = new DateTime();
    $executeAt = (clone $now)->modify('+40 days');

    $wipeoutData = json_encode([
        'scheduled' => true,
        'scheduledAt' => $now->format('c'),
        'executeAt' => $executeAt->format('c'),
        'remainingDays' => 40,
        'scheduledBy' => $user['fullName'] ?? $user['username'],
        'reason' => $_POST['reason'] ?? 'Super Administrator requested complete system reset',
    ]);

    $stmt = $pdo->prepare("REPLACE INTO systemsetting (`key`, `value`, `updatedAt`) VALUES ('SYSTEM_WIPEOUT_SCHEDULED', ?, NOW(3))");
    $stmt->execute([$wipeoutData]);

    $stmtAlarm = $pdo->prepare("REPLACE INTO systemsetting (`key`, `value`, `updatedAt`) VALUES ('SYSTEM_WIPEOUT_ALARM_MUTED', 'false', NOW(3))");
    $stmtAlarm->execute();

    echo json_encode([
        'success' => true,
        'message' => '40-day wipeout scheduled. Siren armed.',
        'executeAt' => $executeAt->format('c'),
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);


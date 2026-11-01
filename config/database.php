<?php
// EL-FAITH MICROFINANCE - Hybrid Database Adapter
// Connects to MySQL on local XAMPP/Cloud DB, or SQLite on Vercel Serverless

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'elfaith_microfinance';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

$pdo = null;

// Attempt MySQL connection
if (!getenv('FORCE_SQLITE')) {
    try {
        $pdo = new PDO(
            "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
            $dbUser,
            $dbPass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 2,
            ]
        );
    } catch (Throwable $e) {
        $pdo = null;
    }
}

// Fallback to SQLite (e.g. Vercel serverless environment)
if (!$pdo) {
    $tempDir = sys_get_temp_dir();
    $sqlitePath = $tempDir . '/elfaith_microfinance_v1.sqlite';
    $isFirstTime = !file_exists($sqlitePath);

    $pdo = new PDO("sqlite:{$sqlitePath}", null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Register MySQL-compatible functions
    $pdo->sqliteCreateFunction('NOW', function() { return date('Y-m-d H:i:s'); });
    $pdo->sqliteCreateFunction('CURDATE', function() { return date('Y-m-d'); });

    require_once __DIR__ . '/sqlite_init.php';
    if ($isFirstTime) {
        initSqliteDatabase($pdo);
    }
}

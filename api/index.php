<?php
// EL-FAITH MICROFINANCE - Vercel Serverless Entry Point & Router
// Routes all incoming requests to the full-stack PHP application

if (session_status() === PHP_SESSION_NONE) {
    $tmp = sys_get_temp_dir();
    if (!empty($tmp) && is_dir($tmp)) {
        @session_save_path($tmp);
    }
}

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = ltrim($requestUri, '/');

$baseDir = dirname(__DIR__);

// Root URL goes to login.php
if ($path === '' || $path === 'index.php') {
    require $baseDir . '/login.php';
    exit;
}

$targetFile = $baseDir . '/' . $path;

if (is_file($targetFile)) {
    $ext = strtolower(pathinfo($targetFile, PATHINFO_EXTENSION));
    if ($ext === 'php') {
        require $targetFile;
        exit;
    }

    $mimes = [
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
    ];
    $contentType = $mimes[$ext] ?? 'application/octet-stream';
    header("Content-Type: {$contentType}");
    readfile($targetFile);
    exit;
}

// Handle requests without .php extension (e.g. /dashboard -> dashboard.php)
if (is_file($targetFile . '.php')) {
    require $targetFile . '.php';
    exit;
}

// Fallback to login
require $baseDir . '/login.php';

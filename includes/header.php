<?php
// EL-FAITH MICROFINANCE - Page Header Component
require_once __DIR__ . '/../config/auth.php';
requireLogin();

$user = getCurrentUser();
$activePage = $activePage ?? '';
$pageTitle = $pageTitle ?? 'Financial Management Portal';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> | <?= APP_NAME ?></title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#f0fdf4',
                            100: '#dcfce7',
                            500: '#22c55e',
                            600: '#16a34a',
                            700: '#15803d',
                            800: '#166534',
                            900: '#14532d',
                        }
                    }
                }
            }
        }
    </script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased flex flex-col min-h-screen">

    <!-- 40-Day Wipeout Emergency Siren Banner -->
    <?php include __DIR__ . '/wipeout_banner.php'; ?>

    <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar Navigation -->
        <?php include __DIR__ . '/sidebar.php'; ?>

        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col overflow-y-auto">
            <!-- Top Bar -->
            <header class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div class="flex items-center space-x-3">
                    <h1 class="text-xl font-extrabold text-slate-900"><?= htmlspecialchars($pageTitle) ?></h1>
                    <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        Wassa Powuako Branch
                    </span>
                </div>

                <div class="flex items-center space-x-4">
                    <div class="text-right hidden sm:block">
                        <div class="text-sm font-bold text-slate-800"><?= htmlspecialchars($user['fullName'] ?? $user['username']) ?></div>
                        <div class="text-xs text-slate-500 font-medium"><?= htmlspecialchars(str_replace('_', ' ', $user['role'])) ?> (<?= htmlspecialchars($user['staffId'] ?? 'STAFF') ?>)</div>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold shadow-md">
                        <?= strtoupper(substr($user['username'] ?? 'U', 0, 1)) ?>
                    </div>
                    <a href="logout.php" title="Sign Out" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <i data-lucide="log-out" class="w-5 h-5"></i>
                    </a>
                </div>
            </header>

            <div class="p-6 md:p-8 flex-1">


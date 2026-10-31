<?php
// EL-FAITH MICROFINANCE - Session & Authentication Handler

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/constants.php';

function getCurrentUser() {
    return $_SESSION['user'] ?? null;
}

function isLoggedIn() {
    return !empty($_SESSION['user']['id']);
}

function isSuperAdmin() {
    return isLoggedIn() && (($_SESSION['user']['role'] ?? '') === ROLE_SUPER_ADMIN);
}

function isCeoOrSuperAdmin() {
    if (!isLoggedIn()) return false;
    $role = $_SESSION['user']['role'] ?? '';
    return $role === ROLE_SUPER_ADMIN || $role === ROLE_CEO;
}

function isStaffOnly() {
    return !isCeoOrSuperAdmin();
}

function requireExecutive() {
    requireLogin();
    if (isStaffOnly()) {
        header('Location: repayments.php?notice=restricted');
        exit;
    }
}

function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: login.php');
        exit;
    }
}

function requireSuperAdmin() {
    requireLogin();
    if (!isSuperAdmin()) {
        header('Location: repayments.php?notice=admin_required');
        exit;
    }
}

function requireCeoOrSuperAdmin() {
    requireLogin();
    if (!isCeoOrSuperAdmin()) {
        header('Location: repayments.php?notice=restricted');
        exit;
    }
}


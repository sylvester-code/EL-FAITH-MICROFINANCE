<?php
// EL-FAITH MICROFINANCE - System Constants & Helpers
// Location: Wassa Powuako, Western Region, Ghana

define('APP_NAME', 'EL-FAITH MICROFINANCE');
define('APP_LOCATION', 'Wassa Powuako, Western Region, Ghana');
define('CURRENCY_SYMBOL', 'GH₵');
define('CURRENCY_CODE', 'GHS');

// User Roles
define('ROLE_SUPER_ADMIN', 'SUPER_ADMIN');
define('ROLE_CEO', 'CEO');
define('ROLE_BRANCH_MANAGER', 'BRANCH_MANAGER');
define('ROLE_LOAN_OFFICER', 'LOAN_OFFICER');
define('ROLE_CASHIER', 'CASHIER');
define('ROLE_ACCOUNTANT', 'ACCOUNTANT');
define('ROLE_AUDITOR', 'AUDITOR');
define('ROLE_CUSTOMER_SERVICE', 'CUSTOMER_SERVICE');

function formatCurrency($amount) {
    return CURRENCY_SYMBOL . ' ' . number_format((float)$amount, 2);
}

function formatDate($datetime) {
    if (!$datetime) return '—';
    $timestamp = is_numeric($datetime) ? $datetime : strtotime($datetime);
    return date('d M Y', $timestamp);
}

function formatDateTime($datetime) {
    if (!$datetime) return '—';
    $timestamp = is_numeric($datetime) ? $datetime : strtotime($datetime);
    return date('d M Y, h:i A', $timestamp);
}

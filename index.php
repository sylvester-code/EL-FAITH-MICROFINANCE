<?php
require_once __DIR__ . '/config/auth.php';

if (isLoggedIn()) {
    if (isStaffOnly()) {
        header('Location: repayments.php');
    } else {
        header('Location: dashboard.php');
    }
} else {
    header('Location: login.php');
}
exit;


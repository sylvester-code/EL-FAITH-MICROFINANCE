<?php
// EL-FAITH MICROFINANCE - 40-Day Emergency Wipeout Protocol & Continuous Audio Siren Banner
// Location: Wassa Powuako, Western Region, Ghana

global $pdo;

$wipeoutActive = false;
$wipeoutInfo = null;
$alarmMuted = false;

try {
    $stmt = $pdo->prepare("SELECT `key`, `value` FROM systemsetting WHERE `key` IN ('SYSTEM_WIPEOUT_SCHEDULED', 'SYSTEM_WIPEOUT_ALARM_MUTED')");
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    if (!empty($settings['SYSTEM_WIPEOUT_SCHEDULED'])) {
        $wipeoutInfo = json_decode($settings['SYSTEM_WIPEOUT_SCHEDULED'], true);
        if ($wipeoutInfo && !empty($wipeoutInfo['scheduled'])) {
            $wipeoutActive = true;
            $alarmMuted = !empty($settings['SYSTEM_WIPEOUT_ALARM_MUTED']) && $settings['SYSTEM_WIPEOUT_ALARM_MUTED'] === 'true';
        }
    }
} catch (Exception $e) {
    // Ignore error if table not queried
}
?>

<?php if ($wipeoutActive && $wipeoutInfo): ?>
<div id="wipeoutEmergencyBanner" class="bg-red-700 text-white px-4 py-3 shadow-2xl border-b-4 border-red-900 sticky top-0 z-50 animate-pulse">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
            <span class="p-2 bg-red-900 rounded-lg text-2xl font-black">🚨</span>
            <div>
                <div class="font-extrabold text-base tracking-wide flex items-center gap-2">
                    CRITICAL: SYSTEM WIPE-OUT ARMED — 40-DAY COUNTDOWN IN PROGRESS
                    <span id="alarmStatusBadge" class="text-xs px-2 py-0.5 rounded-full font-bold <?= $alarmMuted ? 'bg-slate-800 text-slate-300' : 'bg-yellow-400 text-red-900' ?>">
                        <?= $alarmMuted ? 'SIREN MUTED' : 'SIREN ACTIVE' ?>
                    </span>
                </div>
                <div class="text-xs text-red-100">
                    Execution Date: <span class="font-bold underline"><?= htmlspecialchars(date('d M Y, h:i A', strtotime($wipeoutInfo['executeAt']))) ?></span>
                    &bull; Scheduled By: <strong><?= htmlspecialchars($wipeoutInfo['scheduledBy'] ?? 'Super Admin') ?></strong>
                    &bull; <span id="countdownTimer" class="font-mono font-bold text-yellow-300">Calculating...</span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <?php if (isSuperAdmin()): ?>
                <button type="button" onclick="stopWipeoutAlarm()" id="btnStopAlarm" class="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-red-950 text-xs font-black rounded-lg shadow transition">
                    🔇 Stop Audio Siren
                </button>
                <button type="button" onclick="cancelWipeout()" id="btnCancelWipeout" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-red-700 text-xs font-black rounded-lg shadow transition">
                    🛑 Abort & Cancel Wipeout
                </button>
            <?php else: ?>
                <span class="text-xs italic bg-red-800 px-3 py-1 rounded">Super Admin authorization required to abort</span>
            <?php endif; ?>
        </div>
    </div>
</div>

<script>
// Web Audio API Continuous Siren Beeper
let audioCtx = null;
let sirenInterval = null;
let isMuted = <?= $alarmMuted ? 'true' : 'false' ?>;
const executeAtTime = new Date("<?= $wipeoutInfo['executeAt'] ?>").getTime();

function startContinuousSiren() {
    if (isMuted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtx) audioCtx = new AudioContext();

        function playChirp() {
            if (isMuted || !audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';

            // High urgency pitch sweep: 880Hz down to 440Hz
            const now = audioCtx.currentTime;
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.36);
        }

        if (!sirenInterval) {
            playChirp();
            sirenInterval = setInterval(playChirp, 550);
        }
    } catch (e) {
        console.warn('AudioContext requires user gesture or is unsupported:', e);
    }
}

// User interaction unlocks Web Audio if browser autoplay was blocked
window.addEventListener('click', () => {
    if (!isMuted && !sirenInterval) startContinuousSiren();
}, { once: true });

startContinuousSiren();

// Countdown Timer updater
function updateCountdown() {
    const now = new Date().getTime();
    const diff = executeAtTime - now;
    const timerEl = document.getElementById('countdownTimer');
    if (!timerEl) return;

    if (diff <= 0) {
        timerEl.innerText = 'EXPIRED - WIPEOUT PENDING EXECUTION';
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timerEl.innerText = `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
}
setInterval(updateCountdown, 1000);
updateCountdown();

function stopWipeoutAlarm() {
    fetch('api_wipeout.php?action=stop_alarm', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                isMuted = true;
                if (sirenInterval) { clearInterval(sirenInterval); sirenInterval = null; }
                const badge = document.getElementById('alarmStatusBadge');
                if (badge) {
                    badge.innerText = 'SIREN MUTED';
                    badge.className = 'text-xs px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300';
                }
            } else {
                alert(data.message || 'Error stopping siren');
            }
        });
}

function cancelWipeout() {
    if (!confirm('Are you sure you want to cancel the 40-Day Emergency Wipeout and restore normal system operations?')) return;
    fetch('api_wipeout.php?action=cancel', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                isMuted = true;
                if (sirenInterval) clearInterval(sirenInterval);
                window.location.reload();
            } else {
                alert(data.message || 'Error canceling wipeout');
            }
        });
}
</script>
<?php endif; ?>

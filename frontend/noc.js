// DOM Elements
const rpsValue = document.getElementById('rpsValue');
const totalPacketsValue = document.getElementById('totalPacketsValue');
const activeStudentsValue = document.getElementById('activeStudentsValue');
const healthKpiValue = document.getElementById('healthKpiValue');
const targetStatusText = document.getElementById('targetStatusText');
const bandwidthValue = document.getElementById('bandwidthValue');
const currentLatencyDisplay = document.getElementById('currentLatencyDisplay');
const threatLevelBadge = document.getElementById('threatLevelBadge');
const threatLevelText = document.getElementById('threatLevelText');

const healthBar = document.getElementById('healthBar');
const healthText = document.getElementById('healthText');
const cpuBar = document.getElementById('cpuBar');
const cpuText = document.getElementById('cpuText');
const ramBar = document.getElementById('ramBar');
const ramText = document.getElementById('ramText');

const crashOverlay = document.getElementById('crashOverlay');
const resetBtn = document.getElementById('resetBtn');
const nocContainer = document.getElementById('nocContainer');
const terminalFeed = document.getElementById('terminalFeed');
const pauseTerminalBtn = document.getElementById('pauseTerminalBtn');
const clearTerminalBtn = document.getElementById('clearTerminalBtn');
const streamPulse = document.getElementById('streamPulse');
const fullscreenBtn = document.getElementById('fullscreenBtn');

const attackMapCanvas = document.getElementById('attackMapCanvas');
const hudShieldStatus = document.getElementById('hudShieldStatus');
const hudFilterStatus = document.getElementById('hudFilterStatus');
const activeAttackersCount = document.getElementById('activeAttackersCount');

// Defense UI elements
const defenseBadge = document.getElementById('defenseBadge');
const defenseBadgeText = document.getElementById('defenseBadgeText');
const openManualDefenseBtn = document.getElementById('openManualDefenseBtn');
const openMitigationBtn = document.getElementById('openMitigationBtn');
const quickRebootBtn = document.getElementById('quickRebootBtn');
const mitigationModal = document.getElementById('mitigationModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const deploymentProgress = document.getElementById('deploymentProgress');
const deployTitleText = document.getElementById('deployTitleText');
const deployPercentText = document.getElementById('deployPercentText');
const deployMatrixStream = document.getElementById('deployMatrixStream');
const chipKernel = document.getElementById('chipKernel');
const deployStepText = document.getElementById('deployStepText');
const deployBar = document.getElementById('deployBar');
const deployLogs = document.getElementById('deployLogs');
const strategyButtons = document.querySelectorAll('.btn-strategy-action');

// State
let crashed = false;
let isMitigated = false;
let activeStrategy = null;
let isDeploying = false;
let terminalPaused = false;
let shieldRotation = 0;
let radarScanAngle = 0;

// Audio Context for Sound Effects
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, type = 'sine', duration = 0.1, gain = 0.1) {
    try {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        g.gain.setValueAtTime(gain, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function playSuccessChime() {
    playTone(523.25, 'triangle', 0.15, 0.15); // C5
    setTimeout(() => playTone(659.25, 'triangle', 0.15, 0.15), 100); // E5
    setTimeout(() => playTone(783.99, 'triangle', 0.25, 0.2), 200); // G5
    setTimeout(() => playTone(1046.50, 'triangle', 0.4, 0.25), 300); // C6
}

function playAlarmTone() {
    playTone(880, 'sawtooth', 0.15, 0.1);
    setTimeout(() => playTone(440, 'sawtooth', 0.15, 0.1), 150);
}

// Fullscreen Toggle
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fullscreenBtn.innerText = '⛶ Exit Fullscreen';
    } else {
        document.exitFullscreen().catch(() => {});
        fullscreenBtn.innerText = '⛶ Fullscreen';
    }
});

// Chart.js setup
const ctx = document.getElementById('latencyChart').getContext('2d');
Chart.defaults.color = '#8899aa';
Chart.defaults.font.family = "'JetBrains Mono', 'Courier New', monospace";
const MAX_DATA_POINTS = 50;
const chartConfig = {
    type: 'line',
    data: {
        labels: Array(MAX_DATA_POINTS).fill(''),
        datasets: [{
            label: 'Latency (ms)',
            data: Array(MAX_DATA_POINTS).fill(40),
            borderColor: '#00ffcc',
            backgroundColor: 'rgba(0, 255, 204, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.3
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
            y: { 
                beginAtZero: true, 
                suggestedMax: 200, 
                grid: { color: 'rgba(0, 255, 204, 0.07)' },
                ticks: { color: '#667788' }
            },
            x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
    }
};
const latencyChart = new Chart(ctx, chartConfig);

// ==========================================
// BIG SCREEN CYBER THREAT SIMULATION CANVAS
// ==========================================
const mapCtx = attackMapCanvas.getContext('2d');
let mapWidth = 0;
let mapHeight = 0;

function resizeMapCanvas() {
    if (!attackMapCanvas.parentElement) return;
    mapWidth = attackMapCanvas.parentElement.clientWidth;
    mapHeight = attackMapCanvas.parentElement.clientHeight;
    attackMapCanvas.width = mapWidth;
    attackMapCanvas.height = mapHeight;
}
resizeMapCanvas();
window.addEventListener('resize', resizeMapCanvas);

// Global Threat Node Locations (Virtual World Simulation)
const virtualWorldNodes = [
    { name: 'US-EAST (N. Virginia)', xRatio: 0.22, yRatio: 0.38, country: 'US', color: '#ff3344' },
    { name: 'EU-CENTRAL (Frankfurt)', xRatio: 0.52, yRatio: 0.30, country: 'DE', color: '#ffaa00' },
    { name: 'AP-SOUTH (Mumbai)', xRatio: 0.68, yRatio: 0.52, country: 'IN', color: '#00ffcc' },
    { name: 'AP-NORTHEAST (Tokyo)', xRatio: 0.85, yRatio: 0.36, country: 'JP', color: '#ff44aa' },
    { name: 'SA-EAST (São Paulo)', xRatio: 0.32, yRatio: 0.72, country: 'BR', color: '#33ccff' },
    { name: 'RU-WEST (Moscow)', xRatio: 0.60, yRatio: 0.24, country: 'RU', color: '#ff2222' },
    { name: 'AP-SOUTHEAST (Singapore)', xRatio: 0.78, yRatio: 0.62, country: 'SG', color: '#00ff88' },
    { name: 'AF-SOUTH (Johannesburg)', xRatio: 0.54, yRatio: 0.78, country: 'ZA', color: '#ff8800' }
];

let attackParticles = [];
let impactSparks = [];

function spawnAttackStream(fromNode, toX, toY) {
    const fromX = fromNode.xRatio * mapWidth;
    const fromY = fromNode.yRatio * mapHeight;
    
    // Create animated projectile packet
    attackParticles.push({
        fromX,
        fromY,
        toX,
        toY,
        progress: 0,
        speed: 0.015 + Math.random() * 0.02,
        color: isMitigated ? '#ffaa00' : '#ff1a1a',
        size: 2.5 + Math.random() * 2,
        curve: (Math.random() - 0.5) * 80
    });
}

function spawnImpactSparks(x, y, color = '#00ffcc') {
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        impactSparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.03,
            color
        });
    }
}

function drawThreatSimulation() {
    mapCtx.clearRect(0, 0, mapWidth, mapHeight);
    const targetX = mapWidth / 2;
    const targetY = mapHeight / 2;

    // 1. Draw World Grid Lines & Coordinate Radar
    mapCtx.strokeStyle = 'rgba(0, 255, 204, 0.08)';
    mapCtx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < mapWidth; x += gridSize) {
        mapCtx.beginPath();
        mapCtx.moveTo(x, 0);
        mapCtx.lineTo(x, mapHeight);
        mapCtx.stroke();
    }
    for (let y = 0; y < mapHeight; y += gridSize) {
        mapCtx.beginPath();
        mapCtx.moveTo(0, y);
        mapCtx.lineTo(mapWidth, y);
        mapCtx.stroke();
    }

    // 2. Concentric Range Rings from Target
    const maxRadius = Math.min(mapWidth, mapHeight) * 0.45;
    for (let r = 1; r <= 3; r++) {
        mapCtx.beginPath();
        mapCtx.arc(targetX, targetY, (maxRadius / 3) * r, 0, Math.PI * 2);
        mapCtx.strokeStyle = 'rgba(0, 255, 204, 0.12)';
        mapCtx.stroke();
    }

    // 3. Rotating Scanning Sweep Line
    radarScanAngle += 0.015;
    mapCtx.beginPath();
    mapCtx.moveTo(targetX, targetY);
    mapCtx.lineTo(targetX + Math.cos(radarScanAngle) * maxRadius, targetY + Math.sin(radarScanAngle) * maxRadius);
    mapCtx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
    mapCtx.lineWidth = 1.5;
    mapCtx.stroke();

    // 4. Draw Virtual World Bot Nodes
    virtualWorldNodes.forEach((node) => {
        const nx = node.xRatio * mapWidth;
        const ny = node.yRatio * mapHeight;
        
        // Node halo
        mapCtx.beginPath();
        mapCtx.arc(nx, ny, 6, 0, Math.PI * 2);
        mapCtx.fillStyle = node.color;
        mapCtx.shadowColor = node.color;
        mapCtx.shadowBlur = 8;
        mapCtx.fill();
        mapCtx.shadowBlur = 0;

        // Label
        mapCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        mapCtx.font = '10px "JetBrains Mono", monospace';
        mapCtx.fillText(`[${node.country}] ${node.name}`, nx + 10, ny + 3);

        // Connective faint network line to target
        mapCtx.beginPath();
        mapCtx.moveTo(nx, ny);
        mapCtx.lineTo(targetX, targetY);
        mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        mapCtx.lineWidth = 1;
        mapCtx.stroke();
    });

    // 5. Update and Draw Attack Projectiles
    for (let i = attackParticles.length - 1; i >= 0; i--) {
        const p = attackParticles[i];
        p.progress += p.speed;

        // Calculate ballistic position with curvature
        const currentX = p.fromX + (p.toX - p.fromX) * p.progress;
        const currentY = p.fromY + (p.toY - p.fromY) * p.progress + Math.sin(p.progress * Math.PI) * p.curve;

        // Draw projectile and trail
        mapCtx.beginPath();
        mapCtx.arc(currentX, currentY, p.size, 0, Math.PI * 2);
        mapCtx.fillStyle = p.color;
        mapCtx.shadowColor = p.color;
        mapCtx.shadowBlur = 10;
        mapCtx.fill();
        mapCtx.shadowBlur = 0;

        // Impact detection
        const shieldRadius = 55;
        const distToCenter = Math.hypot(currentX - targetX, currentY - targetY);

        if (isMitigated && distToCenter <= shieldRadius) {
            // Deflected by shield!
            spawnImpactSparks(currentX, currentY, activeStrategy === 'anycast' ? '#a855f7' : activeStrategy === 'cdn' ? '#ffaa00' : '#00ffcc');
            attackParticles.splice(i, 1);
        } else if (p.progress >= 1.0) {
            // Hit central target node
            spawnImpactSparks(targetX, targetY, crashed ? '#ff0000' : '#ff5500');
            attackParticles.splice(i, 1);
        }
    }

    // 6. Draw Impact Sparks
    for (let i = impactSparks.length - 1; i >= 0; i--) {
        const s = impactSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= s.decay;

        if (s.life <= 0) {
            impactSparks.splice(i, 1);
            continue;
        }

        mapCtx.beginPath();
        mapCtx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        mapCtx.fillStyle = s.color;
        mapCtx.globalAlpha = s.life;
        mapCtx.fill();
        mapCtx.globalAlpha = 1.0;
    }

    // 7. Draw Central Target Datacenter Hub
    const hubColor = crashed ? '#ff0000' : isMitigated ? '#00ffcc' : '#00ffcc';
    mapCtx.beginPath();
    mapCtx.arc(targetX, targetY, 14, 0, Math.PI * 2);
    mapCtx.fillStyle = hubColor;
    mapCtx.shadowColor = hubColor;
    mapCtx.shadowBlur = 15;
    mapCtx.fill();
    mapCtx.shadowBlur = 0;

    // Target Icon Box
    mapCtx.strokeStyle = '#ffffff';
    mapCtx.lineWidth = 2;
    mapCtx.strokeRect(targetX - 7, targetY - 7, 14, 14);

    // 8. Draw Defense Forcefield Dome (If Mitigated)
    if (isMitigated) {
        shieldRotation += 0.02;
        const shieldR = 55;
        const shieldColor = activeStrategy === 'anycast' ? '#a855f7' : activeStrategy === 'cdn' ? '#ffaa00' : '#00ffcc';

        // Outer glowing shield ring
        mapCtx.beginPath();
        mapCtx.arc(targetX, targetY, shieldR, 0, Math.PI * 2);
        mapCtx.strokeStyle = shieldColor;
        mapCtx.lineWidth = 3;
        mapCtx.shadowColor = shieldColor;
        mapCtx.shadowBlur = 20;
        mapCtx.stroke();
        mapCtx.shadowBlur = 0;

        // Rotating energy notches
        for (let a = 0; a < 6; a++) {
            const angle = shieldRotation + (a * Math.PI / 3);
            const sx = targetX + Math.cos(angle) * (shieldR + 5);
            const sy = targetY + Math.sin(angle) * (shieldR + 5);
            mapCtx.beginPath();
            mapCtx.arc(sx, sy, 3, 0, Math.PI * 2);
            mapCtx.fillStyle = '#ffffff';
            mapCtx.fill();
        }

        // Shield Label
        mapCtx.fillStyle = shieldColor;
        mapCtx.font = 'bold 11px "JetBrains Mono", monospace';
        mapCtx.textAlign = 'center';
        mapCtx.fillText('DEFENSE SHIELD ENGAGED', targetX, targetY + 78);
    } else {
        mapCtx.fillStyle = crashed ? '#ff2222' : '#00ffcc';
        mapCtx.font = '10px "JetBrains Mono", monospace';
        mapCtx.textAlign = 'center';
        mapCtx.fillText(crashed ? 'TARGET OFFLINE' : 'NODE-ALPHA (ORIGIN)', targetX, targetY + 30);
    }

    requestAnimationFrame(drawThreatSimulation);
}
drawThreatSimulation();

// ==========================================
// PRO HACKER CYBER TERMINAL ENGINE
// ==========================================
const geoLocations = ['US-VA', 'EU-FRA', 'AP-MAA', 'AP-TYO', 'SA-SAO', 'RU-MOW', 'SG-SIN', 'KR-ICN', 'GB-LON'];
const protocols = ['HTTP/2 POST', 'TCP SYN_FLOOD', 'TLS HANDSHAKE', 'UDP AMPLIFY', 'RAW SOCKET'];
const sampleSignatures = ['0x4A 0x8F', '0x99 0x2B', '0x1C 0xAA', '0x00 0xFE', '0xDE 0xAD'];

function addProLogEntry(isCritical = false, customText = null) {
    if (terminalPaused || (crashed && !customText)) return;

    const geo = geoLocations[Math.floor(Math.random() * geoLocations.length)];
    const proto = protocols[Math.floor(Math.random() * protocols.length)];
    const sig = sampleSignatures[Math.floor(Math.random() * sampleSignatures.length)];
    const ip = `192.168.${Math.floor(Math.random()*254 + 1)}.${Math.floor(Math.random()*254 + 1)}`;
    const port = Math.floor(1024 + Math.random() * 60000);
    const size = Math.floor(48 + Math.random() * 32);
    const latencyBump = Math.floor(15 + Math.random() * 120);
    const now = new Date();
    const time = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const div = document.createElement('div');
    div.className = 'pro-log-line';

    if (customText) {
        div.innerHTML = `<span class="t-time">${time}</span> <span class="t-sys">${customText}</span>`;
    } else if (isMitigated) {
        div.innerHTML = `
            <span class="t-time">${time}</span>
            <span class="t-tag t-geo">${geo}</span>
            <span class="t-tag t-proto">${proto}</span>
            <span class="t-ip">${ip}:${port}</span>
            <span class="t-sig">${sig}</span>
            <span class="t-status t-blocked">DROPPED BY ${(activeStrategy || 'WAF').toUpperCase()}</span>
        `;
    } else if (isCritical) {
        div.innerHTML = `
            <span class="t-time">${time}</span>
            <span class="t-tag t-geo">${geo}</span>
            <span class="t-tag t-proto">${proto}</span>
            <span class="t-ip">${ip}:${port}</span>
            <span class="t-sig">${sig}</span>
            <span class="t-status t-crit">503 OVERLOAD (+${latencyBump}ms)</span>
        `;
    } else {
        div.innerHTML = `
            <span class="t-time">${time}</span>
            <span class="t-tag t-geo">${geo}</span>
            <span class="t-tag t-proto">${proto}</span>
            <span class="t-ip">${ip}:${port}</span>
            <span class="t-sig">${sig}</span>
            <span class="t-status t-ingress">INGRESS ${size}B</span>
        `;
    }

    terminalFeed.appendChild(div);
    if (terminalFeed.children.length > 200) {
        terminalFeed.removeChild(terminalFeed.firstChild);
    }
    
    // Only auto-scroll down if user hasn't scrolled up to inspect logs
    if (!userScrolledUp) {
        terminalFeed.scrollTop = terminalFeed.scrollHeight;
    }

    // Trigger visual missile in simulation canvas
    if (Math.random() < 0.65) {
        const randomNode = virtualWorldNodes[Math.floor(Math.random() * virtualWorldNodes.length)];
        spawnAttackStream(randomNode, mapWidth / 2, mapHeight / 2);
    }
}

// User Scroll Detection (Allows user to freely scroll up without snap-back)
let userScrolledUp = false;
terminalFeed.addEventListener('scroll', () => {
    const isAtBottom = (terminalFeed.scrollHeight - terminalFeed.scrollTop - terminalFeed.clientHeight) < 40;
    userScrolledUp = !isAtBottom;
});

// Terminal Controls
pauseTerminalBtn.addEventListener('click', () => {
    terminalPaused = !terminalPaused;
    pauseTerminalBtn.innerText = terminalPaused ? 'RESUME' : 'PAUSE';
    pauseTerminalBtn.style.color = terminalPaused ? '#ffaa00' : '#00ffcc';
    if (!terminalPaused) {
        userScrolledUp = false;
        terminalFeed.scrollTop = terminalFeed.scrollHeight;
    }
});

clearTerminalBtn.addEventListener('click', () => {
    terminalFeed.innerHTML = '';
    userScrolledUp = false;
});

// Realistic Dynamic Cyber Telemetry Loop
let currentRpsInterval = null;

function updateFakeTrafficLogs(rps) {
    if (currentRpsInterval) clearInterval(currentRpsInterval);
    
    if (crashed) {
        streamPulse.style.animationDuration = '0s';
        return;
    }

    // Continuous smooth stream: calm heartbeat when idle (1800ms), dynamic speed under attack (100-250ms)
    let intervalMs;
    if (rps > 0) {
        intervalMs = Math.max(90, Math.round(500 / Math.min(10, rps)));
        streamPulse.style.animationDuration = `${Math.max(0.3, 1.2 - (rps / 100))}s`;
    } else {
        intervalMs = 1800; // Continuous live background telemetry
        streamPulse.style.animationDuration = '2.5s';
    }

    currentRpsInterval = setInterval(() => {
        if (!crashed) {
            addProLogEntry(rps > 40);
        }
    }, intervalMs);
}

async function fetchStats() {
    try {
        const res = await fetch('/stats', {
            headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        const data = await res.json();

        // Update Top KPIs
        rpsValue.innerText = data.currentRPS;
        totalPacketsValue.innerText = data.totalPackets;
        activeStudentsValue.innerText = data.activeStudents;
        activeAttackersCount.innerText = data.activeStudents;
        currentLatencyDisplay.innerText = Math.round(data.latency);

        // Calculate Bandwidth Ingress Estimation
        const estBandwidth = ((data.currentRPS * 64 * 8) / 1024).toFixed(1);
        bandwidthValue.innerText = estBandwidth;

        // Health & Status KPIs (Baseline 35%, increases to 100% on attack, drops to 25% on defense)
        const currentHealth = Math.round(data.serverHealth);
        healthBar.style.width = currentHealth + '%';
        healthText.innerText = currentHealth + '%';
        healthKpiValue.innerText = currentHealth + '%';

        // Dynamic Health Bar & KPI Colors
        if (data.crashed || currentHealth >= 100) {
            healthBar.style.background = 'linear-gradient(90deg, #ff0000, #cc0000)';
            healthBar.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.7)';
            healthKpiValue.className = 'big-number text-critical glitch';
            targetStatusText.innerText = 'OVERLOAD COLLAPSE (HTTP 503)';
            targetStatusText.className = 'text-critical';
            threatLevelBadge.className = 'threat-level-badge level-critical font-mono';
            threatLevelText.innerText = 'DEFCON 1 [SYSTEM CRASH]';
        } else if (data.mitigated) {
            healthBar.style.background = 'linear-gradient(90deg, #00ffcc, #00b38f)';
            healthBar.style.boxShadow = '0 0 15px var(--secondary-glow)';
            healthKpiValue.className = 'big-number text-secondary';
            targetStatusText.innerText = `SHIELDED (25% LOAD)`;
            targetStatusText.className = 'text-secondary';
            threatLevelBadge.className = 'threat-level-badge level-mitigated font-mono';
            threatLevelText.innerText = `DEFCON 4 [${(data.mitigationStrategy || 'WAF').toUpperCase()} ACTIVE]`;
        } else if (currentHealth >= 75) {
            healthBar.style.background = 'linear-gradient(90deg, #ff3344, #ff0022)';
            healthBar.style.boxShadow = '0 0 15px rgba(255, 50, 50, 0.6)';
            healthKpiValue.className = 'big-number text-critical';
            targetStatusText.innerText = `CRITICAL OVERLOAD (${currentHealth}%)`;
            targetStatusText.className = 'text-critical';
            threatLevelBadge.className = 'threat-level-badge level-critical font-mono';
            threatLevelText.innerText = 'DEFCON 2 [CRITICAL FLOOD]';
        } else if (currentHealth > 45 || data.totalPackets > 20) {
            healthBar.style.background = 'linear-gradient(90deg, #ffaa00, #cc8800)';
            healthBar.style.boxShadow = '0 0 15px rgba(255, 170, 0, 0.5)';
            healthKpiValue.className = 'big-number text-warning';
            targetStatusText.innerText = `HEAVY LOAD (${currentHealth}%)`;
            targetStatusText.className = 'text-warning';
            threatLevelBadge.className = 'threat-level-badge level-warning font-mono';
            threatLevelText.innerText = 'DEFCON 3 [ELEVATED THREAT]';
        } else {
            healthBar.style.background = 'linear-gradient(90deg, #00ffcc, #00b38f)';
            healthBar.style.boxShadow = '0 0 15px var(--secondary-glow)';
            healthKpiValue.className = 'big-number text-secondary';
            targetStatusText.innerText = `NORMAL (35%)`;
            targetStatusText.className = 'text-secondary';
            threatLevelBadge.className = 'threat-level-badge level-normal font-mono';
            threatLevelText.innerText = 'DEFCON 5 [NORMAL]';
        }

        // Dynamic CPU & RAM calculations: scale with requests, drop on defense
        const packetRatio = Math.min(1.0, data.totalPackets / (data.crashThreshold || 100));
        const rpsRatio = Math.min(1.0, data.currentRPS / 120);
        const loadFactor = Math.max(packetRatio, rpsRatio);

        let fakeCpu, fakeRam;
        if (data.crashed) {
            fakeCpu = 100;
            fakeRam = 98;
        } else if (data.mitigated) {
            fakeCpu = Math.round(8 + Math.random() * 4); // Drops to 8-12%
            fakeRam = Math.round(15 + Math.random() * 4); // Drops to 15-19%
        } else {
            // CPU & RAM increase smoothly as requests increase
            fakeCpu = Math.min(99, Math.round(12 + (loadFactor * 86) + (Math.random() * 2)));
            fakeRam = Math.min(99, Math.round(20 + (loadFactor * 76) + (Math.random() * 2)));
        }
        cpuBar.style.width = fakeCpu + '%';
        cpuText.innerText = fakeCpu + '%';
        ramBar.style.width = fakeRam + '%';
        ramText.innerText = fakeRam + '%';

        // HUD Telemetry
        hudShieldStatus.innerText = data.mitigated ? `${(data.mitigationStrategy || 'WAF').toUpperCase()} ACTIVE` : 'STANDBY';
        hudShieldStatus.className = data.mitigated ? 'text-secondary' : 'text-warning';
        hudFilterStatus.innerText = data.mitigated ? 'SCRUBBING 99.4%' : (data.currentRPS > 60 ? 'FILTER OVERLOAD' : 'NORMAL');

        updateFakeTrafficLogs(data.currentRPS);

        // Crash Handling
        if (data.crashed && !crashed) {
            crashed = true;
            playAlarmTone();
            crashOverlay.classList.add('active');
            latencyChart.data.datasets[0].borderColor = '#ff0000';
            latencyChart.data.datasets[0].backgroundColor = 'rgba(255, 0, 0, 0.2)';
            if (currentRpsInterval) clearInterval(currentRpsInterval);
            addProLogEntry(true, '🚨 CRITICAL SYSTEM CRASH: VOLUMETRIC REQUEST FLOOD DETECTED');
        } else if (!data.crashed && crashed) {
            crashed = false;
            crashOverlay.classList.remove('active');
            latencyChart.data.datasets[0].borderColor = '#00ffcc';
            latencyChart.data.datasets[0].backgroundColor = 'rgba(0, 255, 204, 0.08)';
        }

        // Mitigation Handling
        if (data.mitigated && !isMitigated) {
            isMitigated = true;
            activeStrategy = data.mitigationStrategy || 'waf';
            updateDefenseBadgeUI(activeStrategy);
        } else if (!data.mitigated && isMitigated) {
            isMitigated = false;
            activeStrategy = null;
            defenseBadge.style.display = 'none';
        }

        latencyChart.data.datasets[0].data.push(data.latency);
        latencyChart.data.datasets[0].data.shift();
        latencyChart.update();

    } catch (e) {
        console.error('Error fetching stats:', e);
    }
}

setInterval(fetchStats, 250);

function updateDefenseBadgeUI(strategy) {
    defenseBadge.style.display = 'inline-flex';
    const names = {
        waf: 'WAF LAYER-7 FILTER',
        cdn: 'CLOUD SCRUBBING PROXY',
        anycast: 'ANYCAST BGP SHIELD'
    };
    defenseBadgeText.innerText = `SHIELD ACTIVE: ${names[strategy] || strategy.toUpperCase()}`;
}

// Modal open/close handlers
openMitigationBtn.addEventListener('click', () => {
    initAudio();
    deploymentProgress.style.display = 'none';
    strategyButtons.forEach(b => b.disabled = false);
    mitigationModal.style.display = 'flex';
});

openManualDefenseBtn.addEventListener('click', () => {
    initAudio();
    deploymentProgress.style.display = 'none';
    strategyButtons.forEach(b => b.disabled = false);
    mitigationModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    if (!isDeploying) {
        mitigationModal.style.display = 'none';
        deploymentProgress.style.display = 'none';
    }
});

// Close modal when clicking outside (backdrop) or pressing Escape
mitigationModal.addEventListener('click', (e) => {
    if (e.target === mitigationModal && !isDeploying) {
        mitigationModal.style.display = 'none';
        deploymentProgress.style.display = 'none';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !isDeploying && mitigationModal.style.display === 'flex') {
        mitigationModal.style.display = 'none';
        deploymentProgress.style.display = 'none';
    }
});

// Interactive Strategy Deployment Action with Rapid Cyber Terminal Animation
const strategyDetails = {
    waf: {
        name: 'WAF Layer-7 Rate Limiter',
        title: 'DEPLOYING: WAF_L7_SIGNATURE_FILTER',
        kernel: 'eBPF / XDP TC-FILTER',
        steps: [
            { tag: 'tag-exec', label: 'EXEC', text: 'Compiling eBPF bytecode & attaching to eth0 ingress hook...' },
            { tag: 'tag-rule', label: 'RULE', text: 'Dissecting HTTP payload frame: matching signature 0x4A 0x8F 0x00 [BOTNET]' },
            { tag: 'tag-sec',  label: 'LIMIT', text: 'Enforcing token bucket rate-limiter: max 10 req/s per client IP' },
            { tag: 'tag-ok',   label: 'OK', text: 'Dynamic IP blacklist matrix synchronized across all ingress workers' },
            { tag: 'tag-ok',   label: 'ACTIVE', text: 'WAF Filter Active! 99.4% malicious packet flood intercepted & dropped.' }
        ]
    },
    cdn: {
        name: 'Cloud Scrubbing & CAPTCHA Proxy',
        title: 'DEPLOYING: CLOUD_SCRUBBING_EDGE_PROXY',
        kernel: 'GLOBAL EDGE POPS',
        steps: [
            { tag: 'tag-exec', label: 'EXEC', text: 'Broadcasting DNS CNAME reroute to 240+ Global Edge Scrubbing PoPs...' },
            { tag: 'tag-rule', label: 'CHALLENGE', text: 'Enabling cryptographic JS / CAPTCHA Proof-of-Work challenge pipeline' },
            { tag: 'tag-sec',  label: 'ISOLATE', text: 'Isolating origin Node-Alpha behind authenticated reverse proxy mesh' },
            { tag: 'tag-ok',   label: 'OK', text: 'Ingress traffic scrubbing rate: 99.8% bot requests quarantined at edge' },
            { tag: 'tag-ok',   label: 'ACTIVE', text: 'Cloud Scrubbing Complete! Origin server load stabilized to baseline.' }
        ]
    },
    anycast: {
        name: 'Anycast DNS & BGP Null-Routing',
        title: 'DEPLOYING: ANYCAST_BGP_FLOWSPEC_MESH',
        kernel: 'BGP FLOWSPEC / ANYCAST',
        steps: [
            { tag: 'tag-exec', label: 'BGP', text: 'Announcing Anycast /24 routing prefix to upstream Tier-1 ISP backbones...' },
            { tag: 'tag-rule', label: 'NULL-ROUTE', text: 'Sending BGP Flowspec discard rules for rogue botnet CIDR blocks' },
            { tag: 'tag-sec',  label: 'DISPERSE', text: 'Dispersing volumetric flood energy across distributed global nodes' },
            { tag: 'tag-ok',   label: 'OK', text: 'BGP null-routing confirmed: origin egress zero-drop integrity verified' },
            { tag: 'tag-ok',   label: 'ACTIVE', text: 'Anycast Shield Engaged! Volumetric flood absorbed with 0 origin load.' }
        ]
    }
};

strategyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const strategy = btn.getAttribute('data-strategy');
        await deployDefenseStrategy(strategy);
    });
});

async function deployDefenseStrategy(strategy) {
    if (isDeploying) return;
    isDeploying = true;
    initAudio();

    // 1. Immediately send mitigation request to backend for zero-delay defense activation
    const mitigatePromise = fetch('/mitigate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ strategy })
    }).catch(err => {
        console.error('Error applying mitigation on server:', err);
        return null;
    });

    const info = strategyDetails[strategy] || strategyDetails.waf;
    deploymentProgress.style.display = 'block';
    deployTitleText.innerText = info.title;
    chipKernel.innerText = info.kernel;
    deployLogs.innerHTML = '';
    deployBar.style.width = '0%';
    deployPercentText.innerText = '0%';

    strategyButtons.forEach(b => b.disabled = true);

    // Fast live matrix hex code generator
    let matrixInterval = setInterval(() => {
        let hexes = [];
        for (let k = 0; k < 12; k++) {
            hexes.push('0x' + Math.floor(Math.random()*256).toString(16).toUpperCase().padStart(2, '0'));
        }
        deployMatrixStream.innerText = `[STREAM] ${hexes.join(' ')} | INGRESS_HOOK >> PACKET_INSPECT()`;
    }, 40);

    // Snappy, high-speed step animation (~90ms per step = ~450ms total)
    for (let i = 0; i < info.steps.length; i++) {
        const step = info.steps[i];
        const percent = Math.round(((i + 1) / info.steps.length) * 100);
        
        deployStepText.innerText = `[${i + 1}/${info.steps.length}] ${step.text}`;
        deployBar.style.width = percent + '%';
        deployPercentText.innerText = percent + '%';
        
        const logLine = document.createElement('div');
        logLine.className = 'deploy-log-line';
        logLine.innerHTML = `
            <span class="deploy-log-tag ${step.tag}">[${step.label}]</span>
            <span>${step.text}</span>
        `;
        deployLogs.appendChild(logLine);
        deployLogs.scrollTop = deployLogs.scrollHeight;

        playTone(400 + (i * 120), 'sine', 0.08, 0.12);
        await new Promise(r => setTimeout(r, 90));
    }

    clearInterval(matrixInterval);
    deployMatrixStream.innerText = `[STATUS: ACTIVE] 100% TRAFFIC SCRUBBED | ORIGIN HEALTH: 98% (NORMAL)`;

    // Wait for server response (usually already resolved)
    await mitigatePromise;

    // Instantly update UI state
    isMitigated = true;
    activeStrategy = strategy;
    crashed = false;
    crashOverlay.classList.remove('active');
    updateDefenseBadgeUI(strategy);

    playSuccessChime();

    addProLogEntry(false, `🛡️ [DEFENSE ACTIVATED] ${info.name.toUpperCase()}`);
    addProLogEntry(false, `[DEFENSE] Target System Stabilized - Health: 98% | Latency: ~30ms`);

    latencyChart.data.datasets[0].borderColor = '#00ffcc';
    latencyChart.data.datasets[0].backgroundColor = 'rgba(0, 255, 204, 0.08)';
    nocContainer.classList.remove('glitch');

    // Quick auto-close of modal after successful deployment
    await new Promise(r => setTimeout(r, 250));
    mitigationModal.style.display = 'none';
    deploymentProgress.style.display = 'none';
    isDeploying = false;
    strategyButtons.forEach(b => b.disabled = false);

    // Sync immediately with backend
    await fetchStats().catch(() => {});
}

// Quick Reboot Handler
quickRebootBtn.addEventListener('click', async () => {
    initAudio();
    await resetServer();
});

resetBtn.addEventListener('click', async () => {
    initAudio();
    await resetServer();
});

async function resetServer() {
    try {
        resetBtn.style.opacity = '0.6';
        quickRebootBtn.style.opacity = '0.6';

        // 1. Send reset request to backend
        const res = await fetch('/reset', { 
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true' 
            }
        });
        await res.json().catch(() => null);

        // 2. Reset internal variables
        crashed = false;
        isMitigated = false;
        activeStrategy = null;
        isDeploying = false;
        attackParticles = [];
        impactSparks = [];
        userScrolledUp = false;

        // 3. Reset DOM and modals
        crashOverlay.classList.remove('active');
        mitigationModal.style.display = 'none';
        deploymentProgress.style.display = 'none';
        defenseBadge.style.display = 'none';
        strategyButtons.forEach(b => b.disabled = false);
        nocContainer.classList.remove('glitch');

        // 4. Reset Latency Chart
        latencyChart.data.datasets[0].data = Array(MAX_DATA_POINTS).fill(40);
        latencyChart.data.datasets[0].borderColor = '#00ffcc';
        latencyChart.data.datasets[0].backgroundColor = 'rgba(0, 255, 204, 0.08)';
        latencyChart.update();

        // 5. Clear Terminal Feed
        terminalFeed.innerHTML = '';

        // 6. Reset all KPIs and telemetry displays immediately
        rpsValue.innerText = '0';
        totalPacketsValue.innerText = '0';
        activeStudentsValue.innerText = '0';
        activeAttackersCount.innerText = '0';
        bandwidthValue.innerText = '0.0';
        currentLatencyDisplay.innerText = '35';

        healthBar.style.width = '35%';
        healthBar.style.background = 'linear-gradient(90deg, #00ffcc, #00b38f)';
        healthBar.style.boxShadow = '0 0 15px var(--secondary-glow)';
        healthText.innerText = '35%';
        healthKpiValue.innerText = '35%';
        healthKpiValue.className = 'big-number text-secondary';

        cpuBar.style.width = '12%';
        cpuText.innerText = '12%';
        ramBar.style.width = '20%';
        ramText.innerText = '20%';

        targetStatusText.innerText = 'NORMAL (35%)';
        targetStatusText.className = 'text-secondary';
        threatLevelBadge.className = 'threat-level-badge level-normal font-mono';
        threatLevelText.innerText = 'DEFCON 5 [NORMAL]';

        hudShieldStatus.innerText = 'STANDBY';
        hudShieldStatus.className = 'text-warning';
        hudFilterStatus.innerText = 'NORMAL';

        playSuccessChime();
        addProLogEntry(false, '[SYS] Server reboot complete. All telemetry and counters reset to baseline.');

        // 7. Re-sync with backend
        await fetchStats().catch(() => {});
    } catch(e) {
        console.error('Error resetting server:', e);
    } finally {
        resetBtn.style.opacity = '1';
        quickRebootBtn.style.opacity = '1';
    }
}



const express = require('express');
const cors = require('cors');
const path = require('path');
const ip = require('ip');
const https = require('https');
const qrcode = require('qrcode-terminal');
const localtunnel = require('localtunnel');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent caching on API endpoints
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Serve static frontend files
const frontendDir = path.join(__dirname, '../frontend');
const publicDir = path.join(__dirname, 'public');
const currentFrontendDir = path.join(__dirname, 'frontend');

app.use(express.static(frontendDir));
app.use(express.static(currentFrontendDir));
app.use(express.static(publicDir));

// ============================================================
// Simulation State
// ============================================================

const INITIAL_CRASH_THRESHOLD = 50;

let state = {
    totalPackets: 0,
    currentRPS: 0,
    latency: 35,
    serverHealth: 35,
    crashed: false,
    activeStudents: 0,
    mitigated: false,
    mitigationStrategy: null,
    crashThreshold: INITIAL_CRASH_THRESHOLD,
    mitigateBasePackets: 0
};

// Internal trackers
let packetTimestamps = [];
let studentTracker = new Map();

const RPS_WARNING = 60;
const RPS_CRITICAL = 150;

// ============================================================
// Simulation Loop
// ============================================================

setInterval(() => {
    const now = Date.now();

    // Calculate RPS
    packetTimestamps = packetTimestamps.filter(
        timestamp => now - timestamp < 1000
    );

    state.currentRPS = packetTimestamps.length;

    // Track active students
    let active = 0;

    studentTracker.forEach((lastActive, id) => {
        if (now - lastActive < 5000) {
            active++;
        } else {
            studentTracker.delete(id);
        }
    });

    state.activeStudents = active;

    // ========================================================
    // Simulation Logic
    // ========================================================

    if (state.crashed || state.totalPackets >= state.crashThreshold) {
        state.serverHealth = 100;
        state.crashed = true;
        state.latency = 9999;
        state.currentRPS = 0;
    }

    // ========================================================
    // Mitigated / Defended State
    // ========================================================

    else if (state.mitigated) {
        // When defended, load starts at 25% and climbs as
        // requests push towards the new defense threshold.
        const defenseSpan = Math.max(
            1,
            state.crashThreshold - state.mitigateBasePackets
        );

        const defenseProgress = Math.max(
            0,
            Math.min(
                1.0,
                (state.totalPackets - state.mitigateBasePackets) /
                    defenseSpan
            )
        );

        const rpsFactor = Math.min(
            1.0,
            state.currentRPS / 120
        );

        const loadFactor = Math.max(
            defenseProgress,
            rpsFactor * 0.5
        );

        state.crashed = false;

        state.serverHealth = Math.min(
            100,
            Math.round(25 + loadFactor * 75)
        );

        state.latency = Math.round(
            25 +
                loadFactor * 250 +
                Math.random() * 5
        );
    }

    // ========================================================
    // Normal / Attack State
    // ========================================================

    else {
        // At start = 35%.
        // As requests increase towards 50,
        // health increases towards 100%.
        const packetFactor = Math.min(
            1.0,
            state.totalPackets / state.crashThreshold
        );

        const rpsFactor = Math.min(
            1.0,
            state.currentRPS / 100
        );

        const loadFactor = Math.min(
            1.0,
            Math.max(
                packetFactor,
                rpsFactor * 0.85
            )
        );

        // Increase progressively from 35% to 100%
        state.serverHealth = Math.min(
            100,
            Math.round(35 + loadFactor * 65)
        );

        // Increase latency progressively
        state.latency = Math.round(
            35 +
                loadFactor * 650 +
                Math.random() * 15
        );

        // Crash condition
        if (
            state.totalPackets >= state.crashThreshold ||
            state.serverHealth >= 100
        ) {
            state.serverHealth = 100;
            state.crashed = true;
            state.latency = 9999;
        }
    }
}, 100);

// ============================================================
// API: Event
// ============================================================

const handleEvent = (req, res) => {
    const studentId = req.body?.studentId || req.query?.studentId || req.ip;

    studentTracker.set(
        studentId,
        Date.now()
    );

    // Check if server has crashed
    if (
        state.crashed ||
        state.totalPackets >= state.crashThreshold
    ) {
        state.crashed = true;
        state.serverHealth = 100;
        state.latency = 9999;

        return res.status(503).json({
            error: 'Service Unavailable',
            state,
            reason: `Target crashed (${state.crashThreshold} requests threshold reached)`
        });
    }

    // Count incoming packet
    state.totalPackets++;

    packetTimestamps.push(
        Date.now()
    );

    // ========================================================
    // Mitigation Logic
    // ========================================================

    if (state.mitigated) {
        if (
            state.totalPackets >= state.crashThreshold
        ) {
            state.crashed = true;
            state.serverHealth = 100;
            state.latency = 9999;

            return res.status(503).json({
                error: 'Service Unavailable',
                state,
                reason: `Defense overwhelmed (${state.crashThreshold} requests flood)`
            });
        }

        return res.json({
            success: true,
            mitigated: true,
            strategy: state.mitigationStrategy,
            latency: state.latency,
            totalPackets: state.totalPackets,
            crashThreshold: state.crashThreshold
        });
    }

    // ========================================================
    // Normal Crash Check
    // ========================================================

    if (
        state.totalPackets >= state.crashThreshold
    ) {
        state.crashed = true;
        state.serverHealth = 100;
        state.latency = 9999;

        return res.status(503).json({
            error: 'Service Unavailable',
            state,
            reason: `Target crashed (${state.crashThreshold} requests flood)`
        });
    }

    // Normal response
    return res.json({
        success: true,
        latency: state.latency,
        totalPackets: state.totalPackets,
        crashThreshold: state.crashThreshold
    });
};

app.post('/event', handleEvent);
app.post('/api/event', handleEvent);
app.get('/event', handleEvent);

// ============================================================
// API: Stats
// ============================================================

const handleStats = (req, res) => {
    res.json(state);
};

app.get('/stats', handleStats);
app.get('/api/stats', handleStats);

// ============================================================
// API: Mitigate
// ============================================================

const handleMitigate = (req, res) => {
    const strategy = req.body?.strategy || req.query?.strategy || 'waf';

    state.crashed = false;
    state.mitigated = true;
    state.mitigationStrategy = strategy;
    state.mitigateBasePackets = state.totalPackets;

    // ========================================================
    // Tiered Defense Capacity
    // ========================================================

    if (strategy === 'anycast') {
        // Anycast: +100 capacity
        state.crashThreshold = Math.max(
            state.totalPackets + 100,
            150
        );
    }

    else if (strategy === 'cdn') {
        // CDN: +50 capacity
        state.crashThreshold = Math.max(
            state.totalPackets + 50,
            100
        );
    }

    else {
        // WAF: +50 capacity
        state.crashThreshold = Math.max(
            state.totalPackets + 50,
            100
        );
    }

    state.serverHealth = 25;

    state.latency =
        (
            strategy === 'anycast'
                ? 22
                : strategy === 'cdn'
                    ? 25
                    : 28
        ) +
        Math.random() * 3;

    packetTimestamps = [];

    return res.json({
        success: true,
        state
    });
};

app.all(['/mitigate', '/api/mitigate'], handleMitigate);

// ============================================================
// API: Reset
// ============================================================

const handleReset = (req, res) => {
    state = {
        totalPackets: 0,
        currentRPS: 0,
        latency: 35,
        serverHealth: 35,
        crashed: false,
        activeStudents: 0,
        mitigated: false,
        mitigationStrategy: null,
        crashThreshold: INITIAL_CRASH_THRESHOLD,
        mitigateBasePackets: 0
    };

    packetTimestamps = [];
    studentTracker.clear();

    return res.json({
        success: true,
        state
    });
};

app.all(['/reset', '/api/reset'], handleReset);

// ============================================================
// Helper: Get Public IP
// ============================================================

function getPublicIp() {
    return new Promise((resolve) => {
        https
            .get(
                'https://loca.lt/mytunnelpassword',
                (res) => {
                    let data = '';

                    res.on(
                        'data',
                        chunk => {
                            data += chunk;
                        }
                    );

                    res.on(
                        'end',
                        () => {
                            resolve(
                                data.trim()
                            );
                        }
                    );
                }
            )
            .on('error', () => {
                https
                    .get(
                        'https://api.ipify.org',
                        (res) => {
                            let data = '';

                            res.on(
                                'data',
                                chunk => {
                                    data += chunk;
                                }
                            );

                            res.on(
                                'end',
                                () => {
                                    resolve(
                                        data.trim()
                                    );
                                }
                            );
                        }
                    )
                    .on(
                        'error',
                        () => {
                            resolve(
                                ip.address()
                            );
                        }
                    );
            });
    });
}

// ============================================================
// Start Server
// ============================================================

app.listen(
    PORT,
    '0.0.0.0',
    async () => {
        const localIp = ip.address();

        const localUrl =
            `http://${localIp}:${PORT}`;

        console.log(
            '\n=========================================='
        );

        console.log(
            '⚡ DDOX CYBER DEFENSE SIMULATION SERVER RUNNING'
        );

        console.log(
            '=========================================='
        );

        console.log(
            `[LOCAL] NOC Dashboard:  ${localUrl}/noc.html`
        );

        console.log(
            `[LOCAL] Student Client: ${localUrl}/`
        );

        try {
            console.log(
                '\nEstablishing public tunnel (this may take a few seconds)...'
            );

            const tunnel =
                await localtunnel({
                    port: PORT
                });

            const tunnelPassword =
                await getPublicIp();

            console.log(
                '\n>>> PUBLIC URL GENERATED <<<'
            );

            console.log(
                `NOC Dashboard:  ${tunnel.url}/noc.html`
            );

            console.log(
                `Student Client: ${tunnel.url}/`
            );

            console.log(
                `\nTunnel Password (if prompted by loca.lt): ${tunnelPassword}`
            );

            console.log(
                '\nStudents can scan this PUBLIC QR code from mobile data / different WiFi:\n'
            );

            qrcode.generate(
                tunnel.url,
                {
                    small: true
                }
            );

            tunnel.on(
                'close',
                () => {
                    console.log(
                        'Tunnel closed'
                    );
                }
            );
        }

        catch (err) {
            console.error(
                'Public tunnel unavailable. Fallback to local WiFi network only.',
                err
            );

            console.log(
                '\nStudents can scan this LOCAL QR code on the same WiFi network:\n'
            );

            qrcode.generate(
                localUrl,
                {
                    small: true
                }
            );
        }
    }
);
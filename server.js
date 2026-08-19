const express = require('express');
const cors = require('cors');
const path = require('path');
const ip = require('ip');
const qrcode = require('qrcode-terminal');
const localtunnel = require('localtunnel');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simulation State
let state = {
    totalPackets: 0,
    currentRPS: 0,
    latency: 40,
    serverHealth: 100,
    crashed: false,
    activeStudents: 0
};

// Internal trackers
let packetTimestamps = [];
let studentTracker = new Map(); // ip/id -> last active timestamp

const RPS_WARNING = 60;
const RPS_CRITICAL = 150;

// Simulation loop (runs every 100ms)
setInterval(() => {
    const now = Date.now();
    
    // Calculate RPS (packets in the last 1000ms)
    packetTimestamps = packetTimestamps.filter(t => now - t < 1000);
    state.currentRPS = packetTimestamps.length;
    
    // Track active students (active in the last 5 seconds)
    let active = 0;
    studentTracker.forEach((lastActive, id) => {
        if (now - lastActive < 5000) {
            active++;
        } else {
            studentTracker.delete(id);
        }
    });
    state.activeStudents = active;

    // Simulation Logic
    if (state.crashed) {
        state.latency = 0;
        state.currentRPS = 0;
    } else {
        if (state.currentRPS <= RPS_WARNING) {
            // Normal operation
            state.serverHealth = Math.min(100, state.serverHealth + 2); // recover slowly
            state.latency = 40 + Math.random() * 10;
        } else if (state.currentRPS > RPS_WARNING && state.currentRPS <= RPS_CRITICAL) {
            // Warning state
            const overloadRatio = (state.currentRPS - RPS_WARNING) / (RPS_CRITICAL - RPS_WARNING);
            state.serverHealth = Math.max(1, state.serverHealth - (overloadRatio * 5)); 
            state.latency = 50 + (overloadRatio * 500) + Math.random() * 50;
        } else {
            // Critical crash
            state.serverHealth = 0;
            state.crashed = true;
            state.latency = 9999;
        }
    }
}, 100);

// API Endpoints
app.post('/event', (req, res) => {
    const studentId = req.body.studentId || req.ip;
    studentTracker.set(studentId, Date.now());

    if (state.crashed) {
        return res.status(503).json({ error: 'Service Unavailable', state });
    }

    state.totalPackets++;
    packetTimestamps.push(Date.now());

    // Send a controlled response
    res.json({ success: true, latency: state.latency });
});

app.get('/stats', (req, res) => {
    res.json(state);
});

app.post('/reset', (req, res) => {
    state = {
        totalPackets: 0,
        currentRPS: 0,
        latency: 40,
        serverHealth: 100,
        crashed: false,
        activeStudents: 0
    };
    packetTimestamps = [];
    studentTracker.clear();
    res.json({ success: true });
});

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
    const localIp = ip.address();
    const localUrl = `http://${localIp}:${PORT}`;
    console.log(`\n==========================================`);
    console.log(`DDOX SIMULATION SERVER RUNNING`);
    console.log(`==========================================`);
    console.log(`[LOCAL] NOC Dashboard: ${localUrl}/noc.html`);
    console.log(`[LOCAL] Student Client: ${localUrl}/`);
    
    try {
        console.log(`\nEstablishing public tunnel (this may take a few seconds)...`);
        const tunnel = await localtunnel({ port: PORT });
        
        console.log(`\n>>> PUBLIC URL GENERATED <<<`);
        console.log(`NOC Dashboard: ${tunnel.url}/noc.html`);
        console.log(`Student Client: ${tunnel.url}/`);
        
        console.log(`\nStudents can scan this PUBLIC QR code from anywhere (Mobile Data / Different WiFi):\n`);
        qrcode.generate(tunnel.url, { small: true });
        
        console.log(`\nIMPORTANT: When opening the link, students might see a "Bypass Warning" page.`);
        console.log(`They just need to click "Click to Continue" to reach the simulator.`);
        
        tunnel.on('close', () => {
            console.log('Tunnel closed');
        });
    } catch (err) {
        console.error('Failed to create public tunnel. Fallback to local network only.', err);
        qrcode.generate(localUrl, { small: true });
    }
});

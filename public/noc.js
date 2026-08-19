const rpsValue = document.getElementById('rpsValue');
const totalPacketsValue = document.getElementById('totalPacketsValue');
const activeStudentsValue = document.getElementById('activeStudentsValue');
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
const radarCanvas = document.getElementById('radarCanvas');

// Chart.js setup
const ctx = document.getElementById('latencyChart').getContext('2d');
Chart.defaults.color = '#e0e0e0';
Chart.defaults.font.family = "'Courier New', Courier, monospace";
const MAX_DATA_POINTS = 50;
const chartConfig = {
    type: 'line',
    data: {
        labels: Array(MAX_DATA_POINTS).fill(''),
        datasets: [{
            label: 'Latency (ms)',
            data: Array(MAX_DATA_POINTS).fill(40),
            borderColor: '#00ffcc',
            backgroundColor: 'rgba(0, 255, 204, 0.1)',
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
            y: { beginAtZero: true, suggestedMax: 200, grid: { color: 'rgba(255,255,255,0.1)' } },
            x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
    }
};
const latencyChart = new Chart(ctx, chartConfig);

// Radar Canvas setup
const radarCtx = radarCanvas.getContext('2d');
let width = radarCanvas.parentElement.clientWidth;
let height = radarCanvas.parentElement.clientHeight;
radarCanvas.width = width;
radarCanvas.height = height;

window.addEventListener('resize', () => {
    width = radarCanvas.parentElement.clientWidth;
    height = radarCanvas.parentElement.clientHeight;
    radarCanvas.width = width;
    radarCanvas.height = height;
});

let studentDots = [];

function drawRadar() {
    radarCtx.clearRect(0, 0, width, height);
    
    // Draw grid rings
    radarCtx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
    radarCtx.lineWidth = 1;
    for(let i=1; i<=4; i++) {
        radarCtx.beginPath();
        radarCtx.arc(width/2, height/2, (Math.min(width, height)/2) * (i/4), 0, Math.PI * 2);
        radarCtx.stroke();
    }
    
    // Draw student dots
    studentDots.forEach(p => {
        radarCtx.beginPath();
        radarCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        radarCtx.fillStyle = `rgba(255, 26, 26, ${0.4 + (p.pulse * 0.6)})`;
        radarCtx.fill();
        
        if (p.pulse > 0) {
            radarCtx.beginPath();
            radarCtx.moveTo(p.x, p.y);
            radarCtx.lineTo(width/2, height/2);
            radarCtx.strokeStyle = `rgba(255, 26, 26, ${p.pulse * 0.8})`;
            radarCtx.lineWidth = 2;
            radarCtx.stroke();
            p.pulse -= 0.05;
            if (p.pulse < 0) p.pulse = 0;
        }
    });
    requestAnimationFrame(drawRadar);
}
drawRadar();

// Terminal simulation
function addLogEntry(isCritical = false) {
    const ip = `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
    const port = Math.floor(1024 + Math.random() * 60000);
    const id = Math.random().toString(16).substring(2, 8).toUpperCase();
    
    const div = document.createElement('div');
    div.className = `line ${isCritical ? 'critical' : 'info'}`;
    div.innerText = `[${new Date().toISOString().split('T')[1].substring(0,12)}] ${isCritical?'CRIT':'INFO'} INBOUND ${ip}:${port} SIZE:64B ID:${id}`;
    
    terminalFeed.appendChild(div);
    if (terminalFeed.children.length > 50) {
        terminalFeed.removeChild(terminalFeed.firstChild);
    }
    terminalFeed.scrollTop = terminalFeed.scrollHeight;
}

// Polling loop
let crashed = false;
let currentRpsInterval = null;

function updateFakeTrafficLogs(rps) {
    if (currentRpsInterval) clearInterval(currentRpsInterval);
    
    if (rps > 0 && !crashed) {
        const intervalMs = Math.max(10, 1000 / rps); // Limit to ~100 logs/sec for performance
        currentRpsInterval = setInterval(() => {
            addLogEntry(rps > 60);
        }, intervalMs);
    }
}

async function fetchStats() {
    try {
        const res = await fetch('/stats');
        const data = await res.json();

        rpsValue.innerText = data.currentRPS;
        totalPacketsValue.innerText = data.totalPackets;
        activeStudentsValue.innerText = data.activeStudents;

        healthBar.style.width = data.serverHealth + '%';
        healthText.innerText = Math.round(data.serverHealth) + '%';
        
        // Fake CPU / RAM based on RPS
        const fakeCpu = Math.min(100, 5 + (data.currentRPS / 150) * 95 + (Math.random() * 5));
        const fakeRam = Math.min(100, 14 + (data.currentRPS / 150) * 86 + (Math.random() * 2));
        
        cpuBar.style.width = fakeCpu + '%';
        cpuText.innerText = Math.round(fakeCpu) + '%';
        ramBar.style.width = fakeRam + '%';
        ramText.innerText = Math.round(fakeRam) + '%';

        // Update radar dots based on active students
        while (studentDots.length < data.activeStudents) {
            studentDots.push({
                x: width * 0.1 + Math.random() * width * 0.8,
                y: height * 0.1 + Math.random() * height * 0.8,
                pulse: 0
            });
        }
        while (studentDots.length > data.activeStudents) {
            studentDots.pop();
        }

        // Make them pulse if there's traffic
        if (data.currentRPS > 0 && !data.crashed) {
            studentDots.forEach(dot => dot.pulse = 1.0);
        }

        updateFakeTrafficLogs(data.currentRPS);

        if (data.serverHealth < 30) {
            healthBar.style.background = 'linear-gradient(90deg, #ff0000, #cc0000)';
            rpsValue.className = 'big-number text-critical glitch';
            nocContainer.classList.add('glitch');
        } else if (data.serverHealth < 70) {
            healthBar.style.background = 'linear-gradient(90deg, #ffaa00, #cc8800)';
            rpsValue.className = 'big-number text-warning';
            nocContainer.classList.remove('glitch');
        } else {
            healthBar.style.background = 'linear-gradient(90deg, #00ffcc, #00b38f)';
            rpsValue.className = 'big-number text-secondary';
            nocContainer.classList.remove('glitch');
        }

        if (data.crashed && !crashed) {
            crashed = true;
            crashOverlay.classList.add('active');
            latencyChart.data.datasets[0].borderColor = '#ff0000';
            latencyChart.data.datasets[0].backgroundColor = 'rgba(255, 0, 0, 0.2)';
            if (currentRpsInterval) clearInterval(currentRpsInterval);
        } else if (!data.crashed && crashed) {
            crashed = false;
            crashOverlay.classList.remove('active');
            latencyChart.data.datasets[0].borderColor = '#00ffcc';
            latencyChart.data.datasets[0].backgroundColor = 'rgba(0, 255, 204, 0.1)';
        }

        latencyChart.data.datasets[0].data.push(data.latency);
        latencyChart.data.datasets[0].data.shift();
        latencyChart.update();

    } catch (e) {
        console.error('Error fetching stats:', e);
    }
}

setInterval(fetchStats, 250);

resetBtn.addEventListener('click', async () => {
    try {
        await fetch('/reset', { method: 'POST' });
        latencyChart.data.datasets[0].data = Array(MAX_DATA_POINTS).fill(40);
        latencyChart.update();
        terminalFeed.innerHTML = '';
        nocContainer.classList.remove('glitch');
    } catch(e) {}
});

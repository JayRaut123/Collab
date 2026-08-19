const attackBtn = document.getElementById('attackBtn');
const localCounterEl = document.getElementById('localCounter');
const targetStatusEl = document.getElementById('targetStatus');
const burstModeToggle = document.getElementById('burstMode');
const crashOverlay = document.getElementById('crashOverlay');
const studentTerminal = document.getElementById('studentTerminal');
const targetIpDisplay = document.getElementById('targetIpDisplay');

let localCounter = 0;
let burstInterval = null;
let isCrashed = false;
const studentId = 'student_' + Math.random().toString(36).substring(2, 9);
const targetIp = `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

targetIpDisplay.innerText = targetIp;

// Audio context for sound feedback
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep() {
    if (!audioCtx) return;
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.05);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    } catch(e) {}
}

function triggerVibration() {
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
}

function addOutboundLog() {
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.innerHTML = `<span class="tx">TX >></span> ${targetIp} | PAYLOAD:64B | OK`;
    studentTerminal.appendChild(div);
    if (studentTerminal.children.length > 20) {
        studentTerminal.removeChild(studentTerminal.firstChild);
    }
    studentTerminal.scrollTop = studentTerminal.scrollHeight;
}

async function sendPacket() {
    if (isCrashed) return;

    localCounter++;
    localCounterEl.innerText = localCounter;
    
    playBeep();
    triggerVibration();
    addOutboundLog();

    try {
        const response = await fetch('/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId })
        });
        
        if (response.status === 503) {
            handleCrash();
        } else {
            const data = await response.json();
            if (data.latency > 100) {
                targetStatusEl.innerText = 'DEGRADED';
                targetStatusEl.className = 'text-warning';
            } else {
                targetStatusEl.innerText = 'ONLINE';
                targetStatusEl.className = 'text-secondary';
            }
        }
    } catch (e) {
        handleCrash();
    }
}

function handleCrash() {
    if (isCrashed) return;
    isCrashed = true;
    targetStatusEl.innerText = 'CRASHED';
    targetStatusEl.className = 'text-critical';
    crashOverlay.classList.add('active');
    
    const div = document.createElement('div');
    div.className = 'terminal-line text-critical';
    div.innerHTML = `[ERROR] CONNECTION TIMEOUT`;
    studentTerminal.appendChild(div);
    studentTerminal.scrollTop = studentTerminal.scrollHeight;

    if (burstInterval) {
        clearInterval(burstInterval);
        burstInterval = null;
    }
}

// Check if server is back online
setInterval(async () => {
    if (isCrashed) {
        try {
            const res = await fetch('/stats');
            const data = await res.json();
            if (!data.crashed) {
                isCrashed = false;
                crashOverlay.classList.remove('active');
                targetStatusEl.innerText = 'ONLINE';
                targetStatusEl.className = 'text-secondary';
                localCounter = 0;
                localCounterEl.innerText = localCounter;
                
                const div = document.createElement('div');
                div.className = 'terminal-line text-secondary';
                div.innerHTML = `[SYS] CONNECTION RESTORED`;
                studentTerminal.appendChild(div);
                studentTerminal.scrollTop = studentTerminal.scrollHeight;
            }
        } catch(e){}
    }
}, 1000);

// Interaction logic
const startAttack = (e) => {
    e.preventDefault();
    initAudio();
    if (isCrashed) return;
    
    sendPacket();
    
    if (burstModeToggle.checked && !burstInterval) {
        burstInterval = setInterval(sendPacket, 150); // ~6.6 RPS per user
    }
};

const stopAttack = (e) => {
    e.preventDefault();
    if (burstInterval) {
        clearInterval(burstInterval);
        burstInterval = null;
    }
};

// Event Listeners
attackBtn.addEventListener('mousedown', startAttack);
attackBtn.addEventListener('mouseup', stopAttack);
attackBtn.addEventListener('mouseleave', stopAttack);

attackBtn.addEventListener('touchstart', startAttack, {passive: false});
attackBtn.addEventListener('touchend', stopAttack, {passive: false});
attackBtn.addEventListener('touchcancel', stopAttack, {passive: false});

// Allow hitting spacebar
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
        startAttack(e);
    }
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        stopAttack(e);
    }
});

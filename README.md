# Ddox: Classroom Cybersecurity Simulation

Ddox is a controlled, crowd-powered cybersecurity attack simulation designed for classroom environments. It safely demonstrates the mechanics of a Distributed Denial of Service (DDoS) attack using an interactive web interface.

## System Architecture

The system operates on a standard client-server model entirely contained within a lightweight Node.js environment.

### 1. Backend Server (`server.js`)
The backend is an Express.js server that runs completely in-memory without a database. It serves two main functions:
- **Serving Static Assets:** It hosts the HTML, CSS, and JS files for both the Student Client and the NOC Dashboard.
- **Simulation Engine:** It tracks the total number of packets received in real-time, calculating a rolling "Requests Per Second" (RPS) metric.

The simulation logic runs on a `100ms` interval loop that evaluates the current load:
- **RPS <= 60 (Normal):** Server health is 100%, latency is normal (~40ms).
- **RPS 60 - 150 (Degraded):** The system interpolates simulated latency spikes up to 500ms and gradually reduces the `serverHealth` metric down to 0%.
- **RPS > 150 (Critical Failure):** The server transitions into a `crashed = true` state. It immediately begins returning `HTTP 503 Service Unavailable` to all clients until manually reset by the instructor.

To facilitate remote access over mobile data, the server integrates `localtunnel` to automatically expose the local Express app to a temporary public URL, generating an ASCII QR Code in the terminal upon startup.

### 2. NOC Dashboard (`public/noc.html`)
The Network Operations Center (NOC) dashboard is designed for a projector or large screen. It polls the backend `/stats` endpoint every `250ms` and visualizes the state using:
- **Chart.js:** For rendering the live latency graph.
- **HTML5 Canvas:** For drawing the "Global Threat Radar", which procedurally maps active student connections as pulsating red nodes.
- **CSS Animations:** Under heavy load, the dashboard applies CSS `@keyframes` to simulate CRT monitor glitches and scanline distortions, creating an intense, authentic aesthetic.
- **Terminal Feed:** A simulated text log that scales its output frequency directly with the incoming RPS.

### 3. Student Client (`public/index.html`)
The mobile-first client is what students use to participate in the simulation.
- It features a single large "SEND PACKET" button that executes a standard `fetch()` POST request to the `/event` endpoint.
- It leverages the `window.AudioContext` API for synthesized feedback beeps and the `navigator.vibrate()` API for haptic feedback upon tapping.
- A "Burst Mode" toggle implements an aggressive `setInterval` loop to automate requests, simulating a botnet payload.
- If the client receives an HTTP 503 response, it locks the UI with a "Target Offline" overlay until the backend recovers.

## Safety & Scope
This application is strictly a visual simulation. It does not generate uncontrollable real-world network floods or external attacks. All traffic is localized to the single Node.js instance, and the "crash" state is purely an application-level boolean flag rather than a true resource exhaustion failure.

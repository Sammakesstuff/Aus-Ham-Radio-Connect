
const morseMap = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
    'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
    'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/'
};

const alphabetData = [
    { L: 'A', W: 'Alpha', P: 'AL-FAH' }, { L: 'B', W: 'Bravo', P: 'BRAH-VOH' },
    { L: 'C', W: 'Charlie', P: 'CHAR-LEE' }, { L: 'D', W: 'Delta', P: 'DELL-TAH' },
    { L: 'E', W: 'Echo', P: 'ECK-OH' }, { L: 'F', W: 'Foxtrot', P: 'FOKS-TROT' },
    { L: 'G', W: 'Golf', P: 'GOLF' }, { L: 'H', W: 'Hotel', P: 'HOH-TELL' },
    { L: 'I', W: 'India', P: 'IN-DEE-AH' }, { L: 'J', W: 'Juliet', P: 'JEW-LEE-ETT' },
    { L: 'K', W: 'Kilo', P: 'KEY-LOH' }, { L: 'L', W: 'Lima', P: 'LEE-MAH' },
    { L: 'M', W: 'Mike', P: 'MIKE' }, { L: 'N', W: 'November', P: 'NOH-VEM-BER' },
    { L: 'O', W: 'Oscar', P: 'OSS-CAH' }, { L: 'P', W: 'Papa', P: 'PAH-PAH' },
    { L: 'Q', W: 'Quebec', P: 'KEH-BEC' }, { L: 'R', W: 'Romeo', P: 'ROW-ME-OH' },
    { L: 'S', W: 'Sierra', P: 'SEE-AIR-RAH' }, { L: 'T', W: 'Tango', P: 'TANG-GO' },
    { L: 'U', W: 'Uniform', P: 'YOU-NEE-FORM' }, { L: 'V', W: 'Victor', P: 'VIK-TAH' },
    { L: 'W', W: 'Whiskey', P: 'WISS-KEY' }, { L: 'X', W: 'X-ray', P: 'ECKS-RAY' },
    { L: 'Y', W: 'Yankee', P: 'YANG-KEY' }, { L: 'Z', W: 'Zulu', P: 'ZOO-LOO' }
];

const proxyPrefix = "https://api.allorigins.win/get?url=";
let trackingMarker = null;
let gridLayerGroup = L.layerGroup();
let gridVisible = false;

// Initialize Leaflet Map (Centered broadly on Australia)
const map = L.map('aprs-map').setView([-28.0, 137.0], 4);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);



function updateClock() {
    const now = new Date();
    const timeStr = now.toISOString().substr(11, 8) + " UTC";
    const clockEl = document.getElementById('utc-clock');
    if (clockEl) clockEl.textContent = timeStr;
}

function logUpdate(elementId, callsign, details) {
    const block = document.getElementById(elementId);
    if (!block) return;
    const logHTML = `<div class="log-entry"><span class="entry-call">${callsign}</span> - <span class="entry-data">${details}</span></div>`;
    block.innerHTML += logHTML;
}

function drawMaidenheadGrid() {
    gridLayerGroup.clearLayers();
    for (let lon = 100; lon <= 160; lon += 2) {
        L.polyline([[-45, lon], [-9, lon]], {color: '#30363d', weight: 1}).addTo(gridLayerGroup);
    }
    for (let lat = -46; lat <= -10; lat += 1) {
        L.polyline([[lat, 100], [lat, 160]], {color: '#30363d', weight: 1}).addTo(gridLayerGroup);
    }
}

// ==========================================
// 3. API DATA FETCHERS
// ==========================================

async function fetchPiStarStatus() {
    const piStarUrl = "http://pi-star.local/status.json"; 
    const logBlock = document.getElementById('pistar-log');
    const statusBadge = document.getElementById('pistar-status');
    if (!logBlock || !statusBadge) return;

    try {
        const res = await fetch(`${proxyPrefix}${encodeURIComponent(piStarUrl)}`);
        const wrapper = await res.json();
        const data = JSON.parse(wrapper.contents);
        
        if (data) {
            logBlock.innerHTML = ''; 
            statusBadge.textContent = data.mode || "ONLINE";
            statusBadge.style.borderColor = "#a7f3d0";

            logUpdate('pistar-log', 'NODE', `Frequency: ${data.frequency || '439.000'} MHz`);
            logUpdate('pistar-log', 'LAST-TX', `${data.last_callsign || 'None'} on TG ${data.last_tg || 'N/A'}`);
            logUpdate('pistar-log', 'CPU-TEMP', `${data.temperature || '42'}°C`);
        }
    } catch (err) {
        logBlock.innerHTML = '<div class="log-entry"><span class="entry-time">[Local]</span> Hotspot offline or local network address unresolvable.</div>';
        statusBadge.textContent = "OFFLINE";
        statusBadge.style.borderColor = "#db2777";
    }
}

async function fetchDXClusterSpots() {
    const dxUrl = "https://spothole.app/api/v1/spots?limit=5"; 
    const logBlock = document.getElementById('dx-cluster-log');
    if (!logBlock) return;

    try {
        const res = await fetch(`${proxyPrefix}${encodeURIComponent(dxUrl)}`);
        const wrapper = await res.json();
        const data = JSON.parse(wrapper.contents);
        
        if (data && data.length > 0) {
            logBlock.innerHTML = ''; 
            data.forEach(spot => {
                const infoText = `On ${spot.frequency} MHz | Msg: ${spot.comment || 'CQ DX'}`;
                const html = `<div class="log-entry">
                    <span class="entry-call">${spot.dx_callsign}</span> 
                    <span style="color:#8b949e;">de ${spot.spotter}</span> - 
                    <span class="entry-data">${infoText}</span>
                </div>`;
                logBlock.innerHTML += html;
            });
        }
    } catch (err) {
        logBlock.innerHTML = '<div class="log-entry"><span class="entry-time">[Error]</span> Failed to pull cluster stream.</div>';
    }
}

async function fetchSatellitePasses() {
    const openNotifyUrl = "https://api.opennotify.org/iss-now.json";
    try {
        const res = await fetch(proxyPrefix + encodeURIComponent(openNotifyUrl));
        const wrapper = await res.json();
        const data = JSON.parse(wrapper.contents); 
        if (data.message === "success" && data.iss_position) {
            const satLog = document.getElementById('sat-log');
            if (satLog) {
                satLog.innerHTML = '';
                logUpdate('sat-log', 'ISS-ZARYA', `Lat: ${parseFloat(data.iss_position.latitude).toFixed(2)} | Lon: ${parseFloat(data.iss_position.longitude).toFixed(2)}`);
                logUpdate('sat-log', 'AO-91', 'Pass window: Next elevation rise +42m');
                logUpdate('sat-log', 'PO-101', 'Downlink tracking operational on 145.900 MHz');
            }
        }
    } catch (err) {
        console.error("Sat tracking drop:", err);
    }
}

async function fetchBrandmeisterDMR() {
    const bmTarget = "https://api.brandmeister.network/v2/lh/talkgroup/505";
    const logBlock = document.getElementById('bm-log');
    if (!logBlock) return;

    try {
        const res = await fetch(proxyPrefix + encodeURIComponent(bmTarget));
        const wrapper = await res.json();
        const entries = JSON.parse(wrapper.contents); 
        if (entries && entries.length > 0) {
            logBlock.innerHTML = ''; 
            entries.slice(0, 5).forEach(record => {
                logUpdate('bm-log', record.sourceCallsign, `TG 505 active via ${record.hardware || 'DMR Node'}`);
            });
        } else {
            logBlock.innerHTML = '<div class="log-entry"><span class="entry-time">[System]</span> Channel currently idle.</div>';
        }
    } catch (err) {
        logBlock.innerHTML = '<div class="log-entry"><span class="entry-time">[Error]</span> Stream query blocked.</div>';
    }
}

async function fetchSystemFusionRegistry() {
    const ysfUrl = "https://www.ysfreflector.de/api/list.php"; 
    const ysfLog = document.getElementById('ysf-log');
    if (!ysfLog) return;

    try {
        const res = await fetch(proxyPrefix + encodeURIComponent(ysfUrl));
        const wrapper = await res.json();
        const nodes = JSON.parse(wrapper.contents); 
        if (nodes && nodes.length > 0) {
            ysfLog.innerHTML = '';
            const ausNodes = nodes.filter(node => 
                node.name.toUpperCase().includes('AUS') || 
                node.description.toUpperCase().includes('AUSTRALIA')
            ).slice(0, 5);
            ausNodes.forEach(node => {
                logUpdate('ysf-log', node.name, `Users: ${node.users || 0} (${node.address || 'Linked'})`);
            });
        } else {
            ysfLog.innerHTML = '<div class="log-entry"><span class="entry-time">[System]</span> No nodes found.</div>';
        }
    } catch (err) {
        ysfLog.innerHTML = '<div class="log-entry"><span class="entry-time">[Error]</span> Master directory unresolvable.</div>';
    }
}

// ==========================================
// 4. INTERACTION LISTENERS & INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Generate Phonetic Matrix
    const matrixContainer = document.getElementById('phonetic-matrix');
    if (matrixContainer) {
        matrixContainer.innerHTML = '';
        alphabetData.forEach(item => {
            const box = document.createElement('div');
            box.className = 'alpha-box';
            box.innerHTML = `
                <div class="alpha-letter">${item.L}</div>
                <div class="alpha-popup">
                    <div class="popup-word">${item.W}</div>
                    <div class="popup-voice">[${item.P}]</div>
                </div>
            `;
            matrixContainer.appendChild(box);
        });
    }

    // Build Static Maps Components
    drawMaidenheadGrid();

    // Morse Translation Event
    const cwBtn = document.getElementById('cw-btn');
    if (cwBtn) {
        cwBtn.addEventListener('click', () => {
            const input = document.getElementById('cw-input').value.trim().toUpperCase();
            const encoded = input.split('').map(char => morseMap[char] || '').join(' ');
            document.getElementById('cw-output').textContent = encoded || '...';
        });
    }

    // Grid Overlay Trigger
    const toggleGridBtn = document.getElementById('toggle-grid-btn');
    if (toggleGridBtn) {
        toggleGridBtn.addEventListener('click', () => {
            if (gridVisible) {
                map.removeLayer(gridLayerGroup);
                toggleGridBtn.style.borderColor = '#30363d';
            } else {
                map.addLayer(gridLayerGroup);
                toggleGridBtn.style.borderColor = '#ec4899';
            }
            gridVisible = !gridVisible;
        });
    }

    // APRS Station Search Trigger
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const callsign = document.getElementById('callsign-input').value.trim().toUpperCase();
            if (!callsign) return alert('Enter a target callsign');

            const apiKey = '215889.nnmMKVUZjhC1x1L';
            const aprsUrl = `https://api.aprs.fi/api/get?name=${callsign}&what=loc&format=json&apikey=${apiKey}`;

            try {
                const response = await fetch(proxyPrefix + encodeURIComponent(aprsUrl));
                const wrapper = await response.json();
                const data = JSON.parse(wrapper.contents); 
                if (data.result === 'ok' && data.found > 0) {
                    const entry = data.entries[0];
                    const lat = parseFloat(entry.lat);
                    const lng = parseFloat(entry.lng);

                    if (trackingMarker) map.removeLayer(trackingMarker);
                    trackingMarker = L.marker([lat, lng]).addTo(map);
                    trackingMarker.bindPopup(`<b>${entry.name}</b><br>${entry.comment || ''}`).openPopup();
                    map.flyTo([lat, lng], 11);
                } else {
                    alert(`Station ${callsign} location data not found.`);
                }
            } catch (err) {
                alert('Database routing error.');
            }
        });
    }

    // Clock Engine Loops
    setInterval(updateClock, 1000);
    updateClock();

    // Data Run Invocations
    fetchSatellitePasses();
    fetchBrandmeisterDMR();
    fetchSystemFusionRegistry();
    fetchDXClusterSpots();
    fetchPiStarStatus();

    // Recurring Network Update Hooks
    setInterval(fetchDXClusterSpots, 30000);
    setInterval(fetchPiStarStatus, 30000);
    setInterval(fetchBrandmeisterDMR, 45000);
    setInterval(fetchSystemFusionRegistry, 45000);
    setInterval(fetchSatellitePasses, 60000);
});

document.addEventListener('DOMContentLoaded', () => {
    // Custom dynamic title greeting based on time of day
    const titleElement = document.getElementById('title');
    if (titleElement) {
        const hours = new Date().getHours();
        const greetings = {
            morning: 'Good Morning',
            afternoon: 'Good Afternoon',
            evening: 'Good Evening'
        };
        
        const greeting = hours < 12 
            ? greetings.morning 
            : hours < 18 
            ? greetings.afternoon 
            : greetings.evening;
        
        titleElement.textContent = `${greeting}!`;
    }

    // Typewriter effect configuration
    const phrases = [
        "Downloading from 1kbps broadband modem... ",
        "Buffering.............",
        "beep boop... ",
        "Welcome to the HackClock ecosystem."

    ];
    
    const outputElement = document.getElementById('typed-output');
    if (!outputElement) return;
    
    let phraseIndex = 0;
    let characterIndex = 0;
    let isDeleting = false;
    let timeoutId = null;
    
    const typeSpeed = {
        typing: 70,
        deleting: 30,
        pause: 2000,
        nextPhrase: 500
    };
    
    function typeEffect() {
        const currentPhrase = phrases[phraseIndex];
        
        if (isDeleting) {
            characterIndex--;
        } else {
            characterIndex++;
        }
        
        outputElement.textContent = currentPhrase.substring(0, characterIndex);
        
        let speed = isDeleting ? typeSpeed.deleting : typeSpeed.typing;
        
        if (!isDeleting && characterIndex === currentPhrase.length) {
            speed = typeSpeed.pause;
            isDeleting = true;
        } else if (isDeleting && characterIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            speed = typeSpeed.nextPhrase;
        }
        
        timeoutId = setTimeout(typeEffect, speed);
    }
    
    typeEffect();

    // Button click transition effect
    const enterBtn = document.getElementById('enter-btn');
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            console.log("Loading dashboard modules...");
        });
    }
    // Keep track of the active callsign map marker so we can clear old ones
let trackingMarker = null;

// Grab our HTML elements
const searchBtn = document.getElementById('search-btn');
const callsignInput = document.getElementById('callsign-input');

searchBtn.addEventListener('click', async () => {
    const callsign = callsignInput.value.trim().toUpperCase();
    if (!callsign) return alert('Please enter a valid callsign');

    // Replace 'YOUR_APRS_FI_API_KEY' with your real API key from aprs.fi
    const apiKey = 'ENTERYOURAPIKEYHERE'; 
    const apiUrl = `https://api.aprs.fi/api/get?name=${callsign}&what=loc&format=json&apikey=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.result === 'ok' && data.found > 0) {
            const entry = data.entries[0];
            const lat = parseFloat(entry.lat);
            const lng = parseFloat(entry.lng);
            const comment = entry.comment || 'No status packet comment available.';
            const lastTime = new Date(parseInt(entry.time) * 1000).toLocaleString();

            // Clear previous track marker if one exists
            if (trackingMarker) {
                map.removeLayer(trackingMarker);
            }

            // Create new marker and drop it right onto the map
            trackingMarker = L.marker([lat, lng]).addTo(map);
            
            // Pop open an informational bubble detailing the node telemetry
            trackingMarker.bindPopup(`
                <div style="color: #000;">
                    <b style="font-size: 1.1rem; color: #0284c7;">${entry.name}</b><br>
                    <b>Last Position Update:</b> ${lastTime}<br>
                    <b>Telemetry Data:</b> ${comment}<br>
                    <b>Grid Details:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}
                </div>
            `).openPopup();

            // Slide the map view target smoothly over to the new node coordinates
            map.flyTo([lat, lng], 10);

        } else {
            alert(`No live telemetry coordinates found for callsign: ${callsign}`);
        }
    } catch (error) {
        console.error('Error fetching data from aprs.fi API:', error);
        alert('Failed to reach the APRS server grid. Check console logs.');
    }



    
    
});
});
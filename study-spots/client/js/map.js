// Inizializza la mappa
const map = L.map('map').setView([41.9028, 12.4964], 13); // Coordinate di default (Roma)

// Chiedi la posizione dell'utente quando la pagina viene caricata
document.getElementById('near-me-button').addEventListener('click', getUserLocation);

// Aggiungi un listener per il pulsante "Search"
document.getElementById('search-button').addEventListener('click', searchLocation);


// Aggiungi il layer di OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variabile globale per il marker corrente
let currentMarker = null;

// Funzione per ottenere la posizione dell'utente
function getUserLocation() {
    if (navigator.geolocation) {
        console.log('Richiesta di geolocalizzazione inviata.');
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                console.log(`Posizione trovata: Latitudine ${lat}, Longitudine ${lng}`);

                // Centra la mappa e aggiungi un marker
                centerMap(lat, lng);
                addMarker(lat, lng, 'Sei qui!');
            },
            function (error) {
                console.error('Errore nel recupero della posizione:', error.message);
                alert('Impossibile ottenere la posizione. Assicurati di aver abilitato la geolocalizzazione.');
            }
        );
    } else {
        alert('Geolocalizzazione non supportata dal tuo browser.');
    }
}

// Funzione per cercare una posizione e posizionare un marker
async function searchLocation() {
    const searchInput = document.getElementById('search-input').value.trim();
    if (!searchInput) {
        alert('Inserisci un luogo nella barra di ricerca.');
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json`);
        const data = await response.json();

        if (data.length === 0) {
            alert('Nessun risultato trovato per il luogo inserito.');
            return;
        }

        const { lat, lon } = data[0];
        centerMap(parseFloat(lat), parseFloat(lon));
        addMarker(parseFloat(lat), parseFloat(lon), searchInput);
    } catch (error) {
        console.error('Errore durante la ricerca della posizione:', error);
        alert('Si è verificato un errore durante la ricerca della posizione.');
    }
}

// Funzione per rimuovere il marker esistente
function removeCurrentMarker() {
    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }
}

// Funzione per aggiungere un nuovo marker
function addMarker(lat, lng, popupText) {
    removeCurrentMarker();
    currentMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup(popupText)
        .openPopup();
}

// Funzione per centrare la mappa
function centerMap(lat, lng, zoom = 14) {
    map.setView([lat, lng], zoom);
}




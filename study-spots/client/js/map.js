// Inizializza la mappa
const map = L.map('map').setView([41.9028, 12.4964], 13); // Roma di default

// Layer di base
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Gruppo per i marker degli spot (per poterli pulire facilmente)
const spotsLayer = L.layerGroup().addTo(map);
let currentMarker = null; // Marker della posizione cercata

// Event Listeners dai tuoi bottoni HTML
document.getElementById('search-button').addEventListener('click', async () => {
    await searchLocation();    // Prima trova la posizione
    visualizeSpotOnMap();      // Poi cerca gli spot
});

document.getElementById('near-me-button').addEventListener('click', async () => {
    getUserLocation();         // Questa è asincrona tramite callback, vedi sotto
});

// --- FUNZIONI DI GEOLOCALIZZAZIONE ---

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                window.selectedLatitude = position.coords.latitude;
                window.selectedLongitude = position.coords.longitude;
                centerMap(window.selectedLatitude, window.selectedLongitude);
                addMarker(window.selectedLatitude, window.selectedLongitude, 'Sei qui!');
                
                // Avvia la ricerca degli spot automaticamente dopo aver trovato la posizione
                visualizeSpotOnMap();
            },
            function (error) {
                alert('Errore nel recupero della posizione.');
            }
        );
    }
}

async function searchLocation() {
    const searchInput = document.getElementById('search-input').value.trim();
    if (!searchInput) return alert('Inserisci un luogo.');

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json`);
        const data = await response.json();
        if (data.length === 0) return alert('Nessun risultato.');

        window.selectedLatitude = parseFloat(data[0].lat);
        window.selectedLongitude = parseFloat(data[0].lon);

        centerMap(window.selectedLatitude, window.selectedLongitude);
        addMarker(window.selectedLatitude, window.selectedLongitude, searchInput);
    } catch (e) {
        console.error(e);
    }
}

// ---  VISUALIZZAZIONE SPOT ---

async function visualizeSpotOnMap() {
    const lat = window.selectedLatitude;
    const lng = window.selectedLongitude;

    if (!lat || !lng) {
        alert("Per favore, cerca prima una posizione o usa 'Near me'");
        return;
    }

    // 1. Recupera tutti i tipi selezionati dai checkbox
    const checkedBoxes = document.querySelectorAll('.form-check-input:checked');
    
    const selectedTypes = Array.from(checkedBoxes).map(cb => {
        // Risaliamo al contenitore 'filter-item' e cerchiamo lo span col testo
        // Questo è più robusto rispetto al parentElement.querySelector
        return cb.closest('.filter-item').querySelector('span').innerText.trim();
    });

    if (selectedTypes.length === 0) {
        spotsLayer.clearLayers();
        return;
    }

    // Puliamo la mappa dai vecchi spot
    spotsLayer.clearLayers();

    // 2. Eseguiamo le chiamate API per ogni tipo selezionato
    try {
        for (const type of selectedTypes) {
            let apyType = type; // Variabile temporanea per la mappatura
            if (type === 'Bar') apyType = 'bar'; // Mappatura per il backend
            else if (type === 'Biblioteca') apyType = 'biblio';
            else if (type === 'Coworking') apyType = 'co';
            else if (type === 'Aula Studio') apyType = 'au';

            const url = `/api/spots_search?type=${encodeURIComponent(apyType)}&latitude=${lat}&longitude=${lng}`;
            const response = await fetch(url);
            const spots = await response.json();

            // 3. Aggiungi i marker per ogni spot trovato
            spots.forEach(spot => {
                const marker = L.marker([spot.latitude, spot.longitude]);
                marker.bindPopup('Caricamento...');
                marker._loading = false;

                // Al click sul marker, carichiamo i dati reali dal server
                marker.on('click', async function() {
                    marker.openPopup();

                    if (marker._loading) return;
                    marker._loading = true;
                    marker.setPopupContent('Caricamento...');

                    try {
                        const response = await fetch(`/api/info-spot/${spot.id}`);
                        if (!response.ok) throw new Error('Errore nel caricamento dettagli');

                        const info = await response.json();

                        // Costruiamo il contenuto HTML avanzato
                        const content = createPopupContent(info);
                        marker.setPopupContent(content);
                    } catch (err) {
                        console.error(err);
                        marker.setPopupContent('Errore nel caricamento informazioni.');
                    } finally {
                        marker._loading = false;
                    }
                });

                spotsLayer.addLayer(marker);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento degli spot:', error);
    }
}

// --- UTILS ---

function addMarker(lat, lng, popupText) {
    if (currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker([lat, lng]).addTo(map).bindPopup(popupText).openPopup();
}

function centerMap(lat, lng) {
    map.setView([lat, lng], 14);
}

function createPopupContent(info) {
    // Generiamo i tag come pillole usando lo stile delle tue .tag
    const tagsHtml = info.tags.map(tag => `<span class="tag micro-tag-popup">${tag}</span>`).join('');
    
    // Formattazione rating (usiamo il tuo arancione per le stelle)
    const rating = info.star_avg ? parseFloat(info.star_avg).toFixed(1) : "0.0";

    return `
        <div class="rich-popup">
            <div class="popup-header">
                <h3 class="popup-title">${info.name}</h3>
                <p class="popup-address"><i class="bi bi-geo-alt-fill"></i> ${info.address}</p>
            </div>
            
            <div class="popup-rating-row">
                <span class="rating-score">${rating}</span>
                <span class="rating-stars">★</span>
                <span class="rating-count">(${info.star_count} Recensioni)</span>
            </div>

            <div class="popup-tags-container">
                ${tagsHtml}
            </div>

            <div class="popup-actions d-flex justify-content-between align-items-center">
                <a href="/spot?id=${info.id}" target="_blank" rel="noopener" class="btn-view-spot">
                    Vedi Spot
                </a>
                
            </div>
        </div>
    `;
}
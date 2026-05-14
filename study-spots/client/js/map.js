// Inizializza la mappa
const map = L.map('map').setView([41.9028, 12.4964], 13); // Roma di default

// Layer di base
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Gruppo per i marker degli spot (per poterli pulire facilmente)
const spotsLayer = L.layerGroup().addTo(map);
let currentMarker = null; // Marker della posizione cercata
const searchHereButton = document.getElementById('search-here-button');
const mapResultsList = document.getElementById('map-results-list');
const mapResultsCount = document.getElementById('map-results-count');
let lastSearchCenter = null;
const tagFilterMap = {
    'tag-price-1': '$',
    'tag-price-2': '$$',
    'tag-price-3': '$$$',
    'tag-outdoor': 'outdoor',
    'tag-indoor': 'indoor',
    'tag-outlets': 'outlets',
    'tag-quiet': 'quiet',
    'tag-crowd-low': 'poco affollato',
    'tag-crowd-mid': 'abbastanza affollato',
    'tag-crowd-high': 'molto affollato'
};

// Event Listeners dai tuoi bottoni HTML
document.getElementById('search-button').addEventListener('click', async () => {
    await searchLocation();    // Prima trova la posizione
    visualizeSpotOnMap();      // Poi cerca gli spot
});

document.getElementById('near-me-button').addEventListener('click', async () => {
    getUserLocation();         // Questa è asincrona tramite callback, vedi sotto
});

// Aggiorna gli spot quando cambiano i filtri (con debounce per evitare troppe richieste)
const filterCheckboxes = document.querySelectorAll('.form-check-input, .btn-check');
let filterUpdateTimer = null;

const scheduleFilterUpdate = () => {
    if (!window.selectedLatitude || !window.selectedLongitude) return;
    clearTimeout(filterUpdateTimer);
    filterUpdateTimer = setTimeout(() => {
        visualizeSpotOnMap();
    }, 250);
};

filterCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', scheduleFilterUpdate);
});

if (searchHereButton) {
    searchHereButton.addEventListener('click', () => {
        const center = map.getCenter();
        window.selectedLatitude = center.lat;
        window.selectedLongitude = center.lng;
        lastSearchCenter = center;
        searchHereButton.style.display = 'none';
        visualizeSpotOnMap();
    });
}

// --- FUNZIONI DI GEOLOCALIZZAZIONE ---

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                window.selectedLatitude = position.coords.latitude;
                window.selectedLongitude = position.coords.longitude;
                centerMap(window.selectedLatitude, window.selectedLongitude);
                addMarker(window.selectedLatitude, window.selectedLongitude, 'Sei qui!');
                lastSearchCenter = map.getCenter();
                
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
        lastSearchCenter = map.getCenter();
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
        renderMapResults([]);
        return;
    }

    // Puliamo la mappa dai vecchi spot
    spotsLayer.clearLayers();

    const selectedTagIds = Object.keys(tagFilterMap).filter(id => document.getElementById(id)?.checked);
    const selectedTags = selectedTagIds.map(id => tagFilterMap[id]);
    const priceTags = selectedTagIds.filter(id => id.startsWith('tag-price-')).map(id => tagFilterMap[id]);
    const environmentTags = selectedTagIds.filter(id => id === 'tag-outdoor' || id === 'tag-indoor').map(id => tagFilterMap[id]);
    const serviceTags = selectedTagIds.filter(id => id === 'tag-outlets' || id === 'tag-quiet').map(id => tagFilterMap[id]);
    const crowdTags = selectedTagIds.filter(id => id.startsWith('tag-crowd-')).map(id => tagFilterMap[id]);

    const matchesTagGroups = (tags) => {
        if (priceTags.length > 0 && !priceTags.some(tag => tags.includes(tag))) return false;
        if (environmentTags.length > 0 && !environmentTags.some(tag => tags.includes(tag))) return false;
        if (serviceTags.length > 0 && !serviceTags.some(tag => tags.includes(tag))) return false;
        if (crowdTags.length > 0 && !crowdTags.some(tag => tags.includes(tag))) return false;
        return true;
    };

    const typeLabelMap = {
        'Bar': 'bar',
        'Biblioteca': 'biblio',
        'Coworking': 'co',
        'Aula Studio': 'au'
    };

    const selectedApiTypes = selectedTypes.map(type => typeLabelMap[type] || type.toLowerCase());

    // 2. Eseguiamo una sola chiamata API per tutti gli spot in zona
    try {
        const url = `/api/spots_search_all?latitude=${lat}&longitude=${lng}`;
        const response = await fetch(url);
        const spots = await response.json();

        let spotsToRender = (spots || []).filter(spot => selectedApiTypes.includes(spot.type));

        if (selectedTags.length > 0) {
            const spotInfos = await Promise.all(spotsToRender.map(async (spot) => {
                try {
                    const response = await fetch(`/api/info-spot/${spot.id}`);
                    if (!response.ok) return null;
                    const info = await response.json();
                    const tags = Array.isArray(info.tags) ? info.tags : [];
                    const matches = matchesTagGroups(tags);
                    return matches ? { spot, info } : null;
                } catch (err) {
                    console.error(err);
                    return null;
                }
            }));

            spotsToRender = spotInfos.filter(Boolean);
        }

        // 3. Aggiungi i marker per ogni spot trovato
        (spotsToRender || []).forEach((item) => {
            const spot = item.spot || item;
            const info = item.info;
            const marker = L.marker([spot.latitude, spot.longitude]);
            marker.bindPopup('Caricamento...');
            marker._loading = false;
            marker._spotInfo = info || null;

            // Al click sul marker, carichiamo i dati reali dal server
            marker.on('click', async function() {
                marker.openPopup();

                if (marker._spotInfo) {
                    marker.setPopupContent(createPopupContent(marker._spotInfo));
                    return;
                }

                if (marker._loading) return;
                marker._loading = true;
                marker.setPopupContent('Caricamento...');

                try {
                    const response = await fetch(`/api/info-spot/${spot.id}`);
                    if (!response.ok) throw new Error('Errore nel caricamento dettagli');

                    const spotInfo = await response.json();
                    marker._spotInfo = spotInfo;

                    // Costruiamo il contenuto HTML avanzato
                    const content = createPopupContent(spotInfo);
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

        renderMapResults(spotsToRender);
    } catch (error) {
        console.error('Errore nel caricamento degli spot:', error);
        renderMapResults([]);
    }

    if (searchHereButton) {
        searchHereButton.style.display = 'none';
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

map.on('moveend', () => {
    if (!searchHereButton) return;
    if (!lastSearchCenter) return;

    const current = map.getCenter();
    const distance = current.distanceTo(lastSearchCenter);
    if (distance > 50) {
        searchHereButton.style.display = 'block';
    } else {
        searchHereButton.style.display = 'none';
    }
});

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

function renderMapResults(items) {
    if (!mapResultsList) return;

    mapResultsList.innerHTML = '';

    const normalized = (items || []).map(item => {
        if (item?.spot) return { spot: item.spot, info: item.info };
        return { spot: item, info: item };
    });

    if (mapResultsCount) {
        mapResultsCount.textContent = `${normalized.length} risultati`;
    }

    if (normalized.length === 0) {
        if (window.SpotCard?.renderList) {
            window.SpotCard.renderList(mapResultsList, [], {
                emptyMessage: 'Nessun risultato per i filtri selezionati'
            });
        }
        return;
    }
    const mappedSpots = normalized.map(({ spot, info }) => ({
        ...(spot || {}),
        ...(info || {})
    }));

    if (window.SpotCard?.renderList) {
        window.SpotCard.renderList(mapResultsList, mappedSpots, {
            showComments: true
        });
    }
}
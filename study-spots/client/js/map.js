/*
funzioni principale del file.js:
crea la mappa;
gestisce ricerca luogo / posizione utente;
carica e filtra gli spot;
disegna marker, popup e card risultati
*/


// Inizializza la mappa
//L sta per Leaftet la libreria js utlizza per la mappa, map è la variabile che contiene l'istanza della mappa, 'map' è l'id dell'elemento HTML dove viene disegnata la mappa, scrollWheelZoom: false disabilita lo zoom con la rotella del mouse
const map = L.map('map',{ scrollWheelZoom: false}).setView([41.9028, 12.4964], 13); // Roma di default

// Layer di base per popolare un minimo la mappa (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Gruppo per i marker degli spot (per poterli pulire facilmente),Crea un gruppo speciale per i marker degli spot.
const spotsLayer = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    animate: true,
    animateAddingMarkers: true,
    disableClusteringAtZoom: 16  
});

// Aggiungi il gruppo alla mappa
map.addLayer(spotsLayer);

// Variabile per tenere traccia del marker della posizione cercata (per rimuoverlo quando si cerca un nuovo luogo)
let currentMarker = null; // Marker della posizione cercata

// Riferimenti agli elementi HTML
const searchHereButton = document.getElementById('search-here-button');
const mapResultsList = document.getElementById('map-results-list');
const mapResultsCount = document.getElementById('map-results-count');
const filterCheckboxes = document.querySelectorAll('.form-check-input, .btn-check');

// Mappa per tenere traccia dell'ultimo centro di ricerca e decidere quando mostrare il pulsante "cerca qui"
let lastSearchCenter = map.getCenter();

// Mappa per convertire gli ID dei checkbox in tag effettivi da filtrare negli spot, gli stessi tag salvati nel db
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

// Al caricamento della pagina, se c'è un luogo salvato in sessionStorage, lo inserisce nell'input di ricerca e lo cerca automaticamente
window.addEventListener('DOMContentLoaded', () => {
    const salvato = sessionStorage.getItem('ultimoSpot');
    if (salvato) {
        document.getElementById('search-input').value = salvato;
    }
})

// Event Listeners dei bottoni HTML:

// Al click su "Cerca", cerca il luogo, visualizza gli spot e scende alla mappa
document.getElementById('search-button').addEventListener('click', async () => {
    const locationFound = await searchLocation();

    if (!locationFound) return;

    await visualizeSpotOnMap();
    scrollToMap();
}); 

// Al click su "vicino a me", cerca la posizione dell'utente, visualizza gli spot e scende alla mappa
document.getElementById('near-me-button').addEventListener('click', async () => {
    const locationFound = await getUserLocation();

    //if (!locationFound) return;
    //scrollToMap();
});

// Serve a evitare troppe chiamate mentre cambi filtri.
let filterUpdateTimer = null;

// Al cambio di qualsiasi filtro, aspetta 250ms e poi aggiorna la visualizzazione degli spot (se è stata selezionata una posizione)
const scheduleFilterUpdate = () => {
    if (!window.selectedLatitude || !window.selectedLongitude) return;
    clearTimeout(filterUpdateTimer);
    filterUpdateTimer = setTimeout(() => {
        visualizeSpotOnMap();
    }, 250);
};

// Aggiunge l'evento di cambio a tutti i checkbox dei filtri
filterCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', scheduleFilterUpdate);
});


// cliccando su "cerca qui" aggiorna la posizione centrale di ricerca, nasconde il pulsante e aggiorna gli spot visualizzati
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




//  FUNZIONI DI GEOLOCALIZZAZIONE E RICERCA LUOGO

// Usa l'API di geolocalizzazione del browser per ottenere la posizione dell'utente, centrare la mappa, aggiungere un marker e visualizzare gli spot
function getUserLocation() {
    //navigator.geolocation è un API supportata da quasi tutti i browser 
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

                // Dopo che ha trovato la posizione, scende alla mappa
                scrollToMap();
            },
            function (error) {
                showSystemError('Errore nel recupero della posizione.');
            }
        );
    }
}


// Usa l'API di Nominatim (OpenStreetMap) per cercare un luogo in base alla stringa inserita, centrare la mappa, aggiungere un marker e visualizzare gli spot
async function searchLocation() {
    const searchInput = document.getElementById('search-input').value.trim();
    
    // Salva l'ultimo luogo cercato in sessionStorage, così da poterlo riproporre all'utente al prossimo caricamento della pagina
    sessionStorage.setItem('ultimoSpot', searchInput);

    if (!searchInput) {
        showSystemError('Inserisci un luogo.');
        return false;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json`);
        const data = await response.json();

        if (data.length === 0) {
            showSystemError('Nessun risultato.');
            return false;
        }

        window.selectedLatitude = parseFloat(data[0].lat);
        window.selectedLongitude = parseFloat(data[0].lon);

        centerMap(window.selectedLatitude, window.selectedLongitude);
        addMarker(window.selectedLatitude, window.selectedLongitude, searchInput);
        lastSearchCenter = map.getCenter();

        return true;

    } catch (e) {
        console.error(e);
        showSystemError('Errore durante la ricerca del luogo.');
        return false;
    }
}


//  VISUALIZZAZIONE SPOT SULLA MAPPA

// Funzione principale che recupera gli spot in zona, li filtra in base ai tipi e tag selezionati, e li visualizza sulla mappa con marker e popup avanzati
async function visualizeSpotOnMap() {
    const lat = window.selectedLatitude;
    const lng = window.selectedLongitude;

    if (!lat || !lng) {
        showSystemError("Per favore, cerca prima una posizione o usa 'Near me'");
        return;
    }

    // Recupera tutti i tipi selezionati dai checkbox
    const checkedBoxes = document.querySelectorAll('.form-check-input:checked');
    
    // Mappa i checkbox selezionati ai loro rispettivi nomi di tipo (es. "Bar", "Biblioteca") usando la struttura HTML dei filtri
    
     // closest trova il genitore con classe filter-item, poi prende il testo della label al suo interno, querySelector è un metodo per cercare un elemento all'interno del genitore, e innerText prende il testo visibile, trim rimuove spazi bianchi
    const selectedTypes = Array.from(checkedBoxes)  
    .map(cb => cb.closest('.filter-item')?.querySelector('.filter-label')?.innerText.trim()) 
    .filter(Boolean);

    if (selectedTypes.length === 0) {
        spotsLayer.clearLayers();
        renderMapResults([]);
        return;
    }

    // Puliamo la mappa dai vecchi spot
    spotsLayer.clearLayers();

    // Recupera tutti i tag selezionati e li organizza in gruppi (prezzo, ambiente, servizi, affollamento) per applicare la logica AND tra gruppi e OR all'interno di ogni gruppo
    
    // Object.keys(tagFilterMap) prende tutti gli ID dei checkbox dei tag, filter(id => document.getElementById(id)?.checked) filtra solo quelli che sono effettivamente selezionati, e map(id => tagFilterMap[id]) converte gli ID in tag reali da confrontare con quelli degli spot
    const selectedTagIds = Object.keys(tagFilterMap).filter(id => document.getElementById(id)?.checked);
    //prende array id appena creato e trasforma in array di tag reali usando la mappa tagFilterMap
    const selectedTags = selectedTagIds.map(id => tagFilterMap[id]);
    
    // i tag sono organizzati in gruppi, e la logica di filtro è: se è stato selezionato almeno un tag di un gruppo, lo spot deve avere almeno uno di quei tag (OR), ma se sono stati selezionati tag in gruppi diversi, lo spot deve soddisfare tutti i gruppi (AND)
    //es:selectedTagIds = ['tag-price-1', 'tag-price-2', 'tag-outdoor']  ---> priceTags = ['$', '$$']
    const priceTags = selectedTagIds.filter(id => id.startsWith('tag-price-')).map(id => tagFilterMap[id]);
    const environmentTags = selectedTagIds.filter(id => id === 'tag-outdoor' || id === 'tag-indoor').map(id => tagFilterMap[id]);
    const serviceTags = selectedTagIds.filter(id => id === 'tag-outlets' || id === 'tag-quiet').map(id => tagFilterMap[id]);
    const crowdTags = selectedTagIds.filter(id => id.startsWith('tag-crowd-')).map(id => tagFilterMap[id]);

    // Funzione che verifica se un array di tag di uno spot soddisfa i criteri di filtro basati sui gruppi di tag selezionati
    //es:tags = ['$$', 'outdoor', 'outlets', 'abbastanza affollato']
    // priceTags = ['$', '$$'] e tags = ['$$', 'outdoor']  va bene
    // priceTags = ['$', '$$', '$$$'] tags = ['$$$$', 'outdoor'] non va bene
    const matchesTagGroups = (tags) => {
        // Se sono stati selezionati tag di prezzo, lo spot deve avere almeno uno di quei tag
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

    // Mappa i tipi selezionati ai rispettivi nomi usati nell'API 
    const selectedApiTypes = selectedTypes.map(type => typeLabelMap[type] || type.toLowerCase());

    // Eseguiamo una sola chiamata API per tutti gli spot in zona
    try {
        const url = `/api/spots_search_all?latitude=${lat}&longitude=${lng}`;
        const response = await fetch(url);
        const spots = await response.json();

        // Applichiamo il primo filtro sui tipi, così da ridurre subito il numero di spot da processare per i tag
        let spotsToRender = (spots || []).filter(spot => selectedApiTypes.includes(spot.type));

        if (selectedTags.length > 0) {
            // promisse.all per caricare in parallelo i dettagli di ogni spot filtrato per tipo
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

        // Aggiungi i marker per ogni spot trovato
        (spotsToRender || []).forEach((item) => {
            const spot = item.spot || item;
            const info = item.info;
            const marker = L.marker([spot.latitude, spot.longitude],
                                        {
                                            icon: createSpotIcon(spot.type)
                                        }
                                    );
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

// ========UTILS =========
function createUserIcon() {
    return L.divIcon({
        className: '',
        html: `<div class="user-marker"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

function createSpotIcon(type) {

    
    const icons = {
        bar: 'fa-mug-hot',
        biblio: 'fa-book',
        co: 'fa-laptop',
        au: 'fa-pencil'
    };

    return L.divIcon({
        className: '',
        html: `
            <div class="custom-marker marker-${type}">
                <i class="fa-solid ${icons[type]}"></i>
            </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -36]
    });
}

function addMarker(lat, lng, popupText) {
    if (currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker([lat, lng], {
        icon: createUserIcon(),
        zIndexOffset: 1000
        })
        .addTo(map)
        //.bindPopup(popupText)
        //.openPopup();
}

function centerMap(lat, lng) {
    map.setView([lat, lng], 14);
}

map.on('moveend', () => {
    if (!searchHereButton) return;

    const current = map.getCenter();
    const distance = current.distanceTo(lastSearchCenter);

    if (distance > 150) {
        searchHereButton.style.display = 'block';
    } else {
        searchHereButton.style.display = 'none';
    }
});

function createPopupContent(info) {
    const tags = Array.isArray(info.tags) ? info.tags : [];

    const tagsHtml = tags
        .slice(0, 4)
        .map(tag => `
            <span class="badge rounded-pill text-dark bg-light border fw-bold">
                ${tag}
            </span>
        `)
        .join('');

    const rating = info.star_avg ? parseFloat(info.star_avg).toFixed(1) : "0.0";
    const reviews = info.star_count ?? 0;

    const typeData = {
        bar: {
            label: 'Bar',
            icon: 'fa-mug-hot',
            className: 'popup-bar'
        },
        biblio: {
            label: 'Biblioteca',
            icon: 'fa-book',
            className: 'popup-biblio'
        },
        co: {
            label: 'Coworking',
            icon: 'fa-laptop',
            className: 'popup-co'
        },
        au: {
            label: 'Aula Studio',
            icon: 'fa-pencil',
            className: 'popup-au'
        }
    };

    const type = typeData[info.type] || {
        label: 'Spot',
        icon: 'fa-location-dot',
        className: 'popup-default'
    };

    return `
        <div class="studyspot-popup card border-0 overflow-hidden">
            
            <div class="card-header border-0 text-white ${type.className}">
                <div class="d-flex align-items-center gap-3">
                    <div class="popup-icon-box d-flex align-items-center justify-content-center rounded-4">
                        <i class="fa-solid ${type.icon}"></i>
                    </div>

                    <div>
                        <div class="fw-bold small opacity-75">Categoria</div>
                        <div class="fw-bold fs-6">${type.label}</div>
                    </div>
                </div>
            </div>

            <div class="card-body p-3">
                <h3 class="h6 fw-bold text-dark-blue mb-1 popup-title">
                    ${info.name || 'Nome non disponibile'}
                </h3>

                <p class="small text-muted mb-3 popup-address">
                    <i class="fa-solid fa-location-dot me-1 text-orange"></i>
                    ${info.address || 'Indirizzo non disponibile'}
                </p>

                <div class="d-inline-flex align-items-center gap-2 bg-light border rounded-pill px-3 py-2 mb-3">
                    <span class="fw-bold text-dark-blue">${rating}</span>
                    <i class="fa-solid fa-star text-orange small"></i>
                    <span class="small text-muted fw-bold">${reviews} recensioni</span>
                </div>

                ${
                    tagsHtml
                        ? `<div class="d-flex flex-wrap gap-2 mb-3">${tagsHtml}</div>`
                        : `<p class="small text-muted fw-bold mb-3">Nessun tag disponibile</p>`
                }

                <a href="/spot?id=${info.id}" target="_blank" rel="noopener" 
                   class="btn btn-primary-custom rounded-pill w-100 fw-bold">
                    Vedi Spot
                    <i class="fa-solid fa-arrow-right ms-1"></i>
                </a>
            </div>
        </div>
    `;
}

// Funzione che prende una lista di spot (con o senza info dettagliate) e li rende in una lista HTML sotto la mappa, usando le card di SpotCard se disponibili, altrimenti una semplice lista testuale
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

// Intercetta tutti gli errori standard di JavaScript (es. variabili inesistenti, crash improvvisi)
window.addEventListener('error', function (event) {
    // Evita che l'errore standard blocchi tutto o appaia brutto
    showSystemError(event.message);
    
});

//  Intercetta gli errori delle Promise/Chiamate asincrone non gestite (es. fetch che falliscono senza catch)
window.addEventListener('unhandledrejection', function (event) {
    // event.reason contiene l'oggetto Errore lanciato dentro la Promise
    const messaggio = event.reason.message || "Si è verificato un errore asincrono.";
    showSystemError(messaggio);
});


function scrollToMap() {
    const mapContainer = document.getElementById('map-container');

    if (!mapContainer) return;

    mapContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    setTimeout(() => {
        map.invalidateSize();
    }, 400);
}
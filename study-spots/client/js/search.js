const API_URL = 'https://nominatim.openstreetmap.org/search';

// Aggiungi un listener per l'input di ricerca
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');


searchInput.addEventListener('input', handleInput);
searchInput.addEventListener('input', toggleClearButton);

let debounceTimeout;

function handleInput() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(function () {
        fetchResults(searchInput.value.trim());
    }, 500); // Ritardo di 500ms
}

async function fetchResults(query) {
    if (query.length < 3) {
        updateResultsTable([]);
        return;
    }
    try {
        const results = await fetchFromAPI(query);
        updateResultsTable(results);
    } catch (error) {
        console.error('Errore di rete:', error.message);
    }
}

async function fetchFromAPI(query) {
    // Aggiungiamo limit=5 per non intasare la tabella su mobile
    const url = `${API_URL}?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
    return response.json();
}

function createTableRow(result) {
    const row = document.createElement('tr');
    
    // Aggiungiamo la classe 'pointer' per far capire che è cliccabile (definita nel CSS precedente)
    row.style.cursor = 'pointer';
    
    row.innerHTML = `<td class="py-2 px-3">${result.display_name}</td>`;
    
    row.addEventListener('click', function() {
        // 1. Popola l'input con il nome scelto
        searchInput.value = result.display_name;
        
        // 2. Salva le coordinate globali per map.js
        window.selectedLatitude = parseFloat(result.lat);
        window.selectedLongitude = parseFloat(result.lon);
        
        // 3. Pulisce la tabella dei suggerimenti
        document.getElementById('results-body').innerHTML = '';
        
        // Opzionale: Se vuoi che la mappa si sposti subito dopo il click sul suggerimento,
        // potresti chiamare qui una funzione globale, ma solitamente l'utente clicca poi su "Search"
    });
    return row;
}

function updateResultsTable(results) {
    const tableBody = document.getElementById('results-body');
    tableBody.innerHTML = '';
    
    if (results.length === 0) return;

    results.forEach(function(result) {
        const row = createTableRow(result);
        tableBody.appendChild(row);
    });
}

// Funzione per mostrare/nascondere la X in base al contenuto dell'input
function toggleClearButton() {
    if (searchInput.value.trim().length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
};

// Resetta l'input quando si clicca sulla X
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    
    // Se hai una tabella dei suggerimenti o risultati attivi sotto la barra, la ripulisce
    if (resultsBody) {
        resultsBody.innerHTML = '';
    }

    // Opzionale: Se vuoi scatenare un evento di ricerca vuoto/aggiornamento mappa integrato nel tuo search.js
    searchInput.dispatchEvent(new Event('input'));
});

// Controllo iniziale (es. se la pagina viene ricaricata mantenendo i vecchi dati nel form)
toggleClearButton();
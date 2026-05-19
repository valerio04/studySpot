const API_URL = 'https://nominatim.openstreetmap.org/search';

// Aggiungi un listener per l'input di ricerca
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const tableBody = document.getElementById('results-body');

searchInput.addEventListener('input', handleInput);
searchInput.addEventListener('input', toggleClearButton);

let debounceTimeout;
let abortController; // Serve per annullare le richieste di rete obsolete

function handleInput() {
    toggleClearButton(); // Controlla la X ad ogni carattere inserito

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

    // Se c'è una richiesta HTTP precedente ancora in corso, la cancelliamo
    if (abortController) {
        abortController.abort();
    }
    abortController = new AbortController();

    try {
        const results = await fetchFromAPI(query, abortController.signal);
        updateResultsTable(results);
    } catch (error) {
        // Ignoriamo l'errore se la richiesta è stata semplicemente annullata da noi
        if (error.name !== 'AbortError') {
            console.error('Errore di rete:', error.message);
        }
    }
}

async function fetchFromAPI(query, signal) {
    // Aggiungiamo limit=5 per non intasare la tabella su mobile
    const url = `${API_URL}?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const response = await fetch(url, { signal });    
    if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
    return response.json();
}

function createTableRow(result) {
    const row = document.createElement('tr');
    
    // Aggiungiamo la classe 'pointer' per far capire che è cliccabile (definita nel CSS precedente)
    row.style.cursor = 'pointer';
    
    row.innerHTML = `<td class="py-2 px-3">${result.display_name}</td>`;
    
    row.addEventListener('mousedown', function(event) {
        event.preventDefault();
        // 1. Popola l'input con il nome scelto
        searchInput.value = result.display_name;
        
        // 2. Salva le coordinate globali per map.js
        window.selectedLatitude = parseFloat(result.lat);
        window.selectedLongitude = parseFloat(result.lon);
        
        updateResultsTable([]);
    });
    return row;
}

function updateResultsTable(results) {
    tableBody.innerHTML = '';
    
    if (results.length === 0) {
        tableBody.style.display = 'none';
        return;
    }

    // Ripristina la visibilità (ereditata o da CSS) se ci sono elementi da mostrare
    tableBody.style.display = ''; 

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

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    updateResultsTable([]);
});

// Gestione robusta della chiusura: se l'utente clicca ovunque fuori dalla ricerca, nascondi i suggerimenti
document.addEventListener('click', (event) => {
    if (!searchInput.contains(event.target) && !tableBody.contains(event.target)) {
        tableBody.style.display = 'none';
    }
});

// Se l'utente clicca di nuovo dentro l'input e ci sono vecchi risultati, mostrali di nuovo
searchInput.addEventListener('focus', () => {
    if (tableBody.children.length > 0) {
        tableBody.style.display = '';
    }
});

// Controllo iniziale (es. se la pagina viene ricaricata mantenendo i vecchi dati nel form)
toggleClearButton();
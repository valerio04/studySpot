const API_URL = 'https://nominatim.openstreetmap.org/search';

// Aggiungi un listener per l'input di ricerca
document.getElementById('search-input').addEventListener('input', handleInput);

let debounceTimeout;

function handleInput() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(function () {
        fetchResults(document.getElementById('search-input').value.trim());
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
        document.getElementById('search-input').value = result.display_name;
        
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
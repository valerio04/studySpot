const API_URL = 'https://nominatim.openstreetmap.org/search';
//const API_URL = 'https://cors-anywhere.herokuapp.com/https://nominatim.openstreetmap.org/search';

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
    const url = `${API_URL}?q=${query}&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
    return response.json();
}


function updateResultsTable(results) {
    const tableBody = document.getElementById('results-body');
    tableBody.innerHTML = ''; // Pulisce i risultati precedenti
    results.forEach(function(result) {
        var row = createTableRow(result.display_name);
        tableBody.appendChild(row);
    });
}

function createTableRow(displayName) {
    var row = document.createElement('tr');
    row.innerHTML = '<td>' + displayName + '</td>';
    row.addEventListener('click', function() {
        document.getElementById('search-input').value = displayName;
        document.getElementById('results-body').innerHTML = ''; // Pulisce i risultati dopo la selezione
    });
    return row;
}
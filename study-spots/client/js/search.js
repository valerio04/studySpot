document.getElementById('search-input').addEventListener('input', handleInput);

let debounceTimeout;

function handleInput() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(function () {
        fetchResults(document.getElementById('search-input').value.trim());
    }, 300); // Ritardo di 300ms
}

async function fetchResults(query) {
    if (query.length < 3) return;
    try {
        // Prova diverse API per aggirare i problemi di limitazione
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`);
        //const response = await fetch(`https://cors-anywhere.herokuapp.com/https://nominatim.openstreetmap.org/search?q=${query}&format=json`);
        if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
        const results = await response.json();

        // Mostra i risultati in una tabella
        const tableBody = document.getElementById('results-body');
        tableBody.innerHTML = ''; // Pulisce i risultati precedenti
        results.forEach(function(result) {
            var row = createTableRow(result.display_name);
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Errore di rete:', error.message);
    }
}

function createTableRow(displayName) {
    var row = document.createElement('tr');
    row.innerHTML = '<td>' + displayName + '</td>';
    row.addEventListener('click', function() {
        document.getElementById('search-input').value = displayName;
        tableBody.innerHTML = ''; // Pulisce i risultati dopo la selezione
    });
    return row;
}
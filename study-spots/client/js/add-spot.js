
const form = document.getElementById('add-spot');




// Messaggio di feedback
let message = document.getElementById('add-spot-message');
if (!message) {
    message = document.createElement('div');
    message.id = 'add-spot-message';
    form.insertBefore(message, document.getElementById('annulla'));
}


// Controllo immediato al caricamento della pagina
document.addEventListener('DOMContentLoaded', checkIfAuthenticated);
form.addEventListener('submit', creaSpot);
    
async function checkIfAuthenticated() {
    try {
        
        const response = await fetch('/api/me', { credentials: 'include' });
        
        if (response.status === 401) {
            alert("Devi essere autenticato per accedere a questa pagina.");
            window.location.href = '/login';
        }
    } catch (err) {
        console.log("Errore controllo auth iniziale");
    }
};



async function creaSpot(event) {
    event.preventDefault();
    const formData = new FormData(form);

    // Raccogli i dati base
    const name = formData.get('name-place');
    const address = formData.get('address');
    const type = formData.get('category');
    
    /// --- GEOCODING INIZIO ---
    let latitude = window.selectedLatitude;
    let longitude = window.selectedLongitude;

    // Se l'utente NON ha cliccato sul suggerimento, le variabili window sono vuote.
    // In questo caso facciamo il geocoding di emergenza.
    if (!latitude || !longitude) {
        try {
            const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
            const geoData = await geoResponse.json();
            if (geoData.length > 0) {
                latitude = parseFloat(geoData[0].lat);
                longitude = parseFloat(geoData[0].lon);
            } else {
                message.textContent = "Indirizzo non trovato. Seleziona un suggerimento dalla lista.";
                message.style.color = 'red';
                return;
            }
        } catch (err) {
            console.error(err);
            return;
        }
    }
    // --- GEOCODING FINE ---
    

    // Tag
    const price = formData.get('price');
    const environment = formData.get('environment');
    const outlets = formData.get('outlets') ? 'outlets' : null;
    const quiet = formData.get('quiet') ? 'quiet' : null;
    const crowd = formData.get('crowd');

    // Orari
    
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    let schedule = {};
    days.forEach(day => {
        const open = formData.get(`${day}-open`);
        const close = formData.get(`${day}-close`);
        if (open && close) {
            schedule[day] = { open, close };
        }
    });
    if (Object.keys(schedule).length === 0) schedule = null;

    // Rating e commento
    const rating = formData.get('rating') ? parseInt(formData.get('rating')) : null;
    const comment = formData.get('comment') || null;

    // Costruisci il payload
    const spotData = {
        name,
        address,
        latitude,
        longitude,
        type,
        price,
        environment,
        outlets,
        quiet,
        crowd,
        schedule,
        rating,
        comment
    };

    try {
        const response = await fetch('/api/add-spot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(spotData),
            credentials: 'include'
        });


        // --- GESTIONE 401 (Sessione scaduta o non loggato) ---
        if (response.status === 401) {
            alert("Sessione scaduta o non valida. Effettua nuovamente il login.");
            window.location.href = '/login';
            return;
        }

        const result = await response.json();
        if (!response.ok) {
            message.textContent = result.error || 'Errore durante l\'aggiunta dello spot.';
            message.style.color = 'red';
            return;
        }

        message.textContent = 'Spot aggiunto con successo! Tornando alla mappa...';
        message.style.color = 'green';
        form.reset();
        setTimeout(() => {
                window.location.href = '/'; // Torna alla home
            }, 2000);

    } catch (error) {
        message.textContent = 'Errore di rete: ' + error.message;
        message.style.color = 'red';
        console.error('Errore catch:', error);
    }

}

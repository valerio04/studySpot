
const form = document.getElementById('add-spot');

// FOTO
const photoInput = document.getElementById('photos');
const previewContainer = document.getElementById('image-preview');
let fileList = []; // Array persistente dei file compressi



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


photoInput.addEventListener('change', async (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Controllo limite massimo
    if (fileList.length + selectedFiles.length > 5) {
        alert("Puoi inserire al massimo 5 foto in totale.");
        photoInput.value = ""; // Reset dell'input
        return;
    }

    const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1280,
        useWebWorker: true
    };

    for (const file of selectedFiles) {
        try {
            const compressedBlob = await imageCompression(file, options);
            const compressedFile = new File([compressedBlob], file.name, { type: file.type });
            
            // Aggiungiamo all'array globale
            fileList.push(compressedFile);
            
            // Creiamo l'anteprima con tasto "rimuovi"
            renderPreview(compressedFile, fileList.length - 1);
            
        } catch (error) {
            console.error("Errore compressione:", error);
        }
    }
    
    // Reset dell'input file per permettere di selezionare di nuovo lo stesso file se rimosso
    photoInput.value = "";
});

function renderPreview(file, index) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = "position-relative";
        div.style.width = "80px";
        div.innerHTML = `
            <img src="${e.target.result}" class="rounded border" style="width:80px; height:80px; object-fit:cover;">
            <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 rounded-circle p-0" 
                    style="width:20px; height:20px; line-height:1;" onclick="removeImage(${index})">
                &times;
            </button>
        `;
        previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
}

// Funzione per rimuovere l'immagine
window.removeImage = (index) => {
    fileList.splice(index, 1); // Rimuovi dall'array
    refreshPreviews(); // Ridisegna tutto per aggiornare gli indici
};

function refreshPreviews() {
    previewContainer.innerHTML = "";
    fileList.forEach((file, index) => renderPreview(file, index));
}

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
    const comment = formData.get('comment');

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
        comment,
        photos: fileList
    };

    // --- CONVERSIONE spotData -> FormData ---
    // Questo è il passaggio chiave per poter inviare file e testi insieme
    const finalData = new FormData();
    
    for (const key in spotData) {
        if (key === 'photos') {
            // Aggiungiamo ogni file singolarmente al FormData
            spotData.photos.forEach(file => {
                finalData.append('photos', file);
            });
        } else if (key === 'schedule') {
            // Stringifichiamo schedule poiché deve essere una stringa JSON
            finalData.append(key, JSON.stringify(spotData[key]));
        } else {
            // Aggiungiamo gli altri campi testuali
            finalData.append(key, spotData[key]);
        }
    }

    console.log(finalData);

    try {
        const response = await fetch('/api/add-spot', {
            method: 'POST',
            body: finalData,
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

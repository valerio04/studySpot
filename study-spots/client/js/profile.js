

const displayUsername = document.getElementById('display-username');
const displayPoints = document.getElementById('display-points');

// campi del form "Dati personali"
const inputName = document.getElementById('name');
const inputSurname = document.getElementById('surname');
const inputProfileUsername = document.getElementById('profile-username');
// email non arriva da /api/profile (per come è fatto l'endpoint), quindi la lasciamo com'è
// const inputEmail = document.getElementById('email');

// contatori
const addedSpots = document.getElementById('added-spots');
const savedSpots = document.getElementById('saved-spots');
const commentsCount = document.getElementById('comments');

// Funzione per aggiornare i campi del profilo utente

const inputEmail = document.getElementById('email'); 

document.addEventListener('DOMContentLoaded', aggiornaProfilo);

async function aggiornaProfilo() {
    try {
        const response = await fetch('/api/profile', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Errore durante il recupero del profilo utente.');
        }

        const profile = await response.json();

        // --- Dati Intestazione ---
        if (displayUsername) displayUsername.textContent = profile.username;
        if (displayPoints) displayPoints.textContent = profile.points;

        // --- Campi Input (Dati personali) ---
        if (inputName) inputName.value = profile.name ?? '';
        if (inputSurname) inputSurname.value = profile.surname ?? '';
        if (inputProfileUsername) inputProfileUsername.value = profile.username ?? '';
        
        // ADESSO L'EMAIL FUNZIONA!
        if (inputEmail) inputEmail.value = profile.email ?? '';

        // --- Contatori ---
        // Nota: Assicurati che i nomi coincidano con quelli dell'oggetto 'response' nel backend
        if (addedSpots) addedSpots.textContent = profile.aggiunti_count ?? 0;
        if (savedSpots) savedSpots.textContent = profile.salvati_count ?? 0;
        
        // Attenzione qui: nel backend l'abbiamo chiamata 'commenti_count'
        if (commentsCount) commentsCount.textContent = profile.commenti_count ?? 0;

        // --- Liste dettagliate ---
        const salvatiList = document.getElementById('salvati-list');
        if (salvatiList && Array.isArray(profile.salvati)) {
            salvatiList.innerHTML = '';
            
            if (profile.salvati.length === 0) {
                salvatiList.innerHTML = '<li>Nessun punto salvato</li>';
            } else {
                profile.salvati.forEach((item) => {
                    const li = document.createElement('li');
                    const spot = item.spots;
                    li.textContent = spot ? `${spot.name} - ${spot.address}` : 'Spot non trovato';
                    salvatiList.appendChild(li);
                });
            }
        }

    } catch (error) {
        console.error('Errore:', error);
        // Evita l'alert se l'utente non è loggato (errore 401 previsto)
    }
}
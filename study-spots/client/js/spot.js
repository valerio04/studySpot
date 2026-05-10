'use strict';

// ================= Elementi DOM =================
const spotTitle = document.querySelector('.spot-header h1');
const spotAddress = document.querySelector('.address');
const spotRatingText = document.querySelector('.rating-text');
const tagsContainer = document.querySelector('.micro-tags');
const hoursList = document.querySelector('.hours-card ul');
const reviewList = document.querySelector('.review-list');
const mapsLink = document.querySelector('.google-maps-link');

const btnSalva = document.getElementById('salva');
const formRecensione = document.querySelector('.add-review-box form');

// Parametri URL
const urlParams = new URLSearchParams(window.location.search);
const currentSpotId = urlParams.get('id');

// ================= Event Listeners =================
document.addEventListener('DOMContentLoaded', inizializzaPagina);

if (btnSalva) {
    btnSalva.addEventListener('click', gestisciSalvataggio);
}

if (formRecensione) {
    formRecensione.addEventListener('submit', gestisciInvioRecensione);
}

// ================= Funzioni Principali =================

async function inizializzaPagina() {
    if (!currentSpotId) {
        console.error("ID dello spot non trovato nell'URL");
        return;
    }
    
    // Carichiamo i dati dello spot e lo stato del salvataggio in parallelo
    await Promise.all([
        caricaDatiSpot(),
        controllaStatoSalvataggio()
    ]);
}

//================= 1. Controllo Stato Salvataggio =================

async function controllaStatoSalvataggio() {
    try {
        const response = await fetch(`/api/is-saved/${currentSpotId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.isSaved) {
                applicaStatoSalvato(true);
            }
        }
    } catch (error) {
        console.error('Errore controllo salvataggio:', error);
    }
}
//================= Carica i dati dello spot da /api/info-spot/:id =================

async function caricaDatiSpot() {
    try {
        const response = await fetch(`/api/info-spot/${currentSpotId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Errore durante il recupero dei dati dello spot.');
        }

        const dataSpot = await response.json();
        
        // Popola l'interfaccia
        popolaPagina(dataSpot);

    } catch (error) {
        console.error('Errore caricamento spot:', error);
        // Feedback visivo in caso di errore
        if (spotTitle) spotTitle.textContent = "Errore nel caricamento";
    }
}

/**
 * Distribuisce i dati dell'oggetto spot nei vari elementi della pagina
 */
function popolaPagina(spot) {
    // 1. Intestazione e Info Base
    if (spotTitle) spotTitle.textContent = spot.name;
    if (spotAddress) spotAddress.textContent = spot.address;
    if (spotRatingText) spotRatingText.textContent = `${spot.star_avg || 0} (${spot.star_count || 0} recensioni)`;

    // 2. Tag (Pillole)
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        spot.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = tag;
            tagsContainer.appendChild(span);
        });
    }

    // 3. Link Google Maps
    if (mapsLink) {
        mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.address)}`;
    }

    // 4. Orari di Apertura
    popolaOrari(spot.hours);

    // 5. Recensioni
    popolaRecensioni(spot.recensioni);
}

//================= Funzioni di Popolamento Specifiche =================

function popolaOrari(hours) {
    if (!hoursList) return;
    hoursList.innerHTML = '';

    const oggiIndice = new Date().getDay();
    const giorniSettimana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const giornoOggiTesto = giorniSettimana[oggiIndice];

    hours.forEach(item => {
        const li = document.createElement('li');
        if (item.day_of_week === giornoOggiTesto) li.className = 'current-day';

        const apertura = item.open_time.substring(0, 5);
        const chiusura = item.close_time.substring(0, 5);
        const orarioTesto = (apertura === chiusura) ? 'Chiuso' : `${apertura} - ${chiusura}`;

        li.innerHTML = `<span>${item.day_of_week}:</span> <span>${orarioTesto}</span>`;
        hoursList.appendChild(li);
    });
}

function popolaRecensioni(recensioni) {
    if (!reviewList) return;
    reviewList.innerHTML = '';

    if (!recensioni || recensioni.length === 0) {
        reviewList.innerHTML = '<p class="text-muted">Nessuna recensione presente.</p>';
        return;
    }

    recensioni.forEach(rec => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        const stelle = '★'.repeat(rec.star) + '☆'.repeat(5 - rec.star);

        reviewItem.innerHTML = `
            <div class="review-user">
                <img src="${rec.user_img || 'assets/img/profile.png'}" alt="Avatar">
                <div>
                    <strong>${rec.username || 'Utente'}</strong>
                    <span class="stars-small">${stelle}</span>
                </div>
            </div>
            <p>${rec.comment || ''}</p>
        `;
        reviewList.appendChild(reviewItem);
    });
}

//================= Gestione Azioni Utente (POST) =================

async function gestisciSalvataggio() {
    // Verifichiamo se è già salvato controllando la classe CSS
    const giaSalvato = btnSalva.classList.contains('saved');
    
    // Scegliamo rotta e metodo in base allo stato attuale
    const endpoint = giaSalvato ? '/api/rimuovi-spot-salvato' : '/api/salva-spot';
    const metodo = giaSalvato ? 'DELETE' : 'POST';

    try {
        const response = await fetch(endpoint, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idSpot: currentSpotId })
        });

        if (response.ok) {
            // Invertiamo lo stato grafico
            applicaStatoSalvato(!giaSalvato);
            const msg = giaSalvato ? "Rimosso dai preferiti" : "Salvato nei preferiti!";
            console.log(msg);
        } else if (response.status === 401) {
            alert("Effettua il login per gestire i preferiti.");
            window.location.href = '/login';
        }
    } catch (error) {
        console.error("Errore durante l'operazione di salvataggio:", error);
    }
}

/**
 * Helper per cambiare l'aspetto del tasto
 */

function applicaStatoSalvato(salvato) {
    if (salvato) {
        btnSalva.classList.add('saved');
        
    } else {
        btnSalva.classList.remove('saved');
    }
}

async function gestisciInvioRecensione(e) {
    e.preventDefault();

    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const commentText = document.querySelector('.review-textarea').value;

    if (!ratingInput) {
        alert("Seleziona una valutazione.");
        return;
    }

    try {
        const response = await fetch('/api/add-comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                spotId: currentSpotId, 
                rating: ratingInput.value, 
                comment: commentText 
            })
        });

        if (response.ok) {
            alert("Recensione pubblicata!");
            location.reload();
        } else if (response.status === 401) {
            alert("Accedi per recensire.");
            window.location.href = '/login';
        } else {
            const err = await response.json();
            throw new Error(err.error);
        }
    } catch (error) {
        console.error("Errore invio recensione:", error);
    }
}
'use strict';

// ================= Elementi DOM =================
const Title = document.querySelector('title');
const spotTitle = document.querySelector('.spot-header h1');
const spotAddress = document.querySelector('.address');
const spotRatingText = document.querySelector('.rating-text');
const tagsContainer = document.querySelector('.micro-tags');
const hoursList = document.querySelector('.card-body ul');
const reviewList = document.querySelector('.review-list');
const mapsLink = document.querySelector('.google-maps-link');
const nearbyGrid = document.getElementById('nearby-spots-grid');

const btnSalva = document.getElementById('salva');
const btnRemove = document.getElementById('btn-delete-spot');
const formRecensione = document.querySelector('.add-review-box form');

// Parametri URL
const urlParams = new URLSearchParams(window.location.search);
const currentSpotId = urlParams.get('id');

// Store all reviews for show more functionality
let allReviews = [];

// ================= Event Listeners =================
document.addEventListener('DOMContentLoaded', inizializzaPagina);

if (btnSalva) {
    btnSalva.addEventListener('click', gestisciSalvataggio);
}

if (btnRemove) {
    btnRemove.addEventListener('click',gestisciCancellazione);
}

if (formRecensione) {
    formRecensione.addEventListener('submit', gestisciInvioRecensione);
}

// Show more reviews button handler
const btnShowMoreReviews = document.querySelector('.btn-show-all-reviews');
if (btnShowMoreReviews) {
    btnShowMoreReviews.addEventListener('click', mostraReviewsAggiuntive);
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
        console.log("Spot richiesto:", dataSpot);
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
async function popolaPagina(spot) {
    // 1. Intestazione e Info Base
    const response = await fetch(`/api/me`, {
            credentials: 'include'
        });

    if (!response.ok) {
        throw new Error('Errore durante il recupero dei dati dello spot.');
    }

    const user = await response.json();
    console.log("verifica utente role", user);

    if (spot.isOwner || user.profile.role == 'admin') {
        btnRemove.style.display = 'inline';
        console.log('isOwner');
    }
    if (Title) Title.textContent = spot.name;
    if (spotTitle) spotTitle.textContent = spot.name;
    if (spotAddress) spotAddress.textContent = spot.address;
    if (spotRatingText) spotRatingText.textContent = `${spot.star_avg || 0} (${spot.star_count || 0} recensioni)`;

    // Aggiorna le stelle in base alla media
    popolaStelle(spot.star_avg || 0);

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

    // 6. Nearby Spots
    if (spot.spotsVicini) {
        popolaSpotVicini(spot.spotsVicini);
    }
}

//================= Funzioni di Popolamento Specifiche =================

/**
 * Popola l'elemento con classe 'stars' con le stelle colorate
 * @param {number} starAvg - Media delle stelle (es. 3.5)
 */
function popolaStelle(starAvg) {
    const starsElement = document.querySelector('.stars');
    if (!starsElement) return;
    
    // Arrotonda a 0.5 per mostrare mezza stella se necessario
    const roundedStar = Math.round(starAvg * 2) / 2;
    const fullStars = Math.floor(roundedStar);
    //const hasHalfStar = roundedStar % 1 !== 0;
    const emptyStars = 5 - fullStars /*(hasHalfStar ? 1 : 0)*/;
    
    let starsText = '★'.repeat(fullStars);
    //if (hasHalfStar) starsText += '½';
    starsText += '☆'.repeat(emptyStars);
    
    starsElement.textContent = starsText;
}

function popolaOrari(hours) {
    if (!hoursList) return;
    hoursList.innerHTML = '';

    const oggiIndice = new Date().getDay();
    const giorniSettimana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const giornoOggiTesto = giorniSettimana[oggiIndice];

    hours.forEach(item => {
        const li = document.createElement('li');
        
        const apertura = item.open_time.substring(0, 5);
        const chiusura = item.close_time.substring(0, 5);
        const orarioTesto = (apertura === chiusura) ? 'Chiuso' : `${apertura} - ${chiusura}`;

        // Check if this is today
        if (item.day_of_week.toLowerCase() === giornoOggiTesto) {
            li.classList.add('current-day');
        }

        li.innerHTML = `<span class="fw-bold">${capitalizeDayName(item.day_of_week)}:</span> <span>${orarioTesto}</span>`;
        hoursList.appendChild(li);
    });
}

function capitalizeDayName(day) {
    const dayMap = {
        'monday': 'Lunedì',
        'tuesday': 'Martedì',
        'wednesday': 'Mercoledì',
        'thursday': 'Giovedì',
        'friday': 'Venerdì',
        'saturday': 'Sabato',
        'sunday': 'Domenica'
    };
    return dayMap[day.toLowerCase()] || day;
}

function popolaRecensioni(recensioni) {
    if (!reviewList) return;
    reviewList.innerHTML = '';

    if (!recensioni || recensioni.length === 0) {
        reviewList.innerHTML = '<p class="text-muted">Nessuna recensione presente.</p>';
        return;
    }

    // Store all reviews for show more functionality
    allReviews = recensioni;
    
    // Show only first 3 reviews
    const mostrareRecensioni = recensioni.slice(0, 3);
    
    mostrareRecensioni.forEach(rec => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        const stelle = '★'.repeat(rec.star) + '☆'.repeat(5 - rec.star);

        reviewItem.innerHTML = `
            <div class="review-user">
                <i class="fa-solid fa-circle-user"></i>
                <div>
                    <strong>${rec.username || 'Utente'}</strong>
                    <span class="stars-small">${stelle}</span>
                </div>
            </div>
            <p>${rec.comment || ''}</p>
        `;
        reviewList.appendChild(reviewItem);
    });

    // If more than 3 reviews, add a "show more" button
    if (recensioni.length > 3) {
        const btnShowMore = document.querySelector('.btn-show-all-reviews');
        if (btnShowMore) {
            btnShowMore.style.display = 'block';
            btnShowMore.textContent = `Mostra tutte le ${recensioni.length} recensioni ↓`;
        }
    } else {
        const btnShowMore = document.querySelector('.btn-show-all-reviews');
        if (btnShowMore) {
            btnShowMore.style.display = 'none';
        }
    }
}

function mostraReviewsAggiuntive() {
    if (!reviewList || !allReviews.length) return;
    
    reviewList.innerHTML = '';
    
    allReviews.forEach(rec => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        const stelle = '★'.repeat(rec.star) + '☆'.repeat(5 - rec.star);

        reviewItem.innerHTML = `
            <div class="review-user">
                <img src="${rec.user_img || '../assets/img/profile.png'}" alt="Avatar">
                <div>
                    <strong>${rec.username || 'Utente'}</strong>
                    <span class="stars-small">${stelle}</span>
                </div>
            </div>
            <p>${rec.comment || ''}</p>
        `;
        reviewList.appendChild(reviewItem);
    });

    // Hide the show more button
    const btnShowMore = document.querySelector('.btn-show-all-reviews');
    if (btnShowMore) {
        btnShowMore.style.display = 'none';
    }
}

function popolaSpotVicini(spotsVicini) {
    if (!nearbyGrid || !spotsVicini || spotsVicini.length === 0) return;
    
    nearbyGrid.innerHTML = '';
    
    spotsVicini.forEach(spot => {
        const card = document.createElement('div');
        card.className = 'nearby-spot-card';
        
        const tagsHtml = spot.tags && spot.tags.length > 0 
            ? spot.tags.map(tag => `<span class="tag">${tag}</span>`).join('')
            : '';
        
        card.innerHTML = `
            <img src="${spot.image || ''}" alt="${spot.name}" class="nearby-spot-card-img" onerror="this.style.display='none'">
            <div class="nearby-spot-card-content">
                <h3>${spot.name}</h3>
                ${spot.address ? `<p class="address-small">${spot.address}</p>` : ''}
                ${tagsHtml ? `<div class="micro-tags">${tagsHtml}</div>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            window.location.href = `/pages/spot.html?id=${spot.id}`;
        });
        
        nearbyGrid.appendChild(card);
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

async function gestisciCancellazione() {
    // Chiediamo conferma all'utente prima di procedere
    const conferma = confirm("Sei sicuro di voler eliminare definitivamente questo spot?");
    if (!conferma) return;

    try {
        const response = await fetch(`/api/remove-spot/${currentSpotId}`, {
            method: 'DELETE', // O 'POST' se la tua API non accetta DELETE
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.ok) {
            alert("Spot eliminato con successo.");
            // Reindirizza l'utente alla home o alla mappa dopo l'eliminazione
            window.location.href = '/'; 
        } else if (response.status === 401 || response.status === 403) {
            alert("Non hai i permessi necessari per eliminare questo spot.");
        } else {
            const err = await response.json();
            throw new Error(err.error || "Errore durante la cancellazione");
        }
    } catch (error) {
        console.error("Errore cancellazione spot:", error);
        alert("Si è verificato un errore: " + error.message);
    }
}
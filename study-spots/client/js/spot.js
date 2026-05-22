'use strict';

// ================= Elementi DOM =================
const Title = document.querySelector('title');
const spotTitle = document.querySelector('.spot-header h1');
const spotAddress = document.querySelector('.address');
const spotRatingText = document.querySelector('.rating-text');
const tagsContainer = document.querySelector('.micro-tags');
const hoursList = document.querySelector('.card-body ul');
const reviewList = document.querySelector('.review-list');
const nearbyGrid = document.getElementById('nearby-spots-grid');
const fotoPrincipaleContainer = document.getElementById('foto-principale');
const grigliaFotoContainer = document.getElementById('griglia-foto');
const btnSalva = document.getElementById('salva');
const btnRemove = document.getElementById('btn-delete-spot');
const formRecensione = document.querySelector('.add-review-box form');
const googleMapFrame = document.getElementById('google-map-frame');

const aiSummaryBtn = document.getElementById('ai-summary-btn');
const aiSummaryResult = document.getElementById('ai-summary-result');

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

if (aiSummaryBtn) {
    aiSummaryBtn.addEventListener('click', generaRiassuntoAI);
}

// ================= Funzioni Principali =================

async function inizializzaPagina() {
    if (!currentSpotId) {
        showSystemError("ID dello spot non trovato nell'URL");
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
        showSystemError('Errore controllo salvataggio');
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
        showSystemError('Errore caricamento spot');
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
        console.log("non loggato");
    }
    else{
        const user = await response.json();
        console.log("verifica utente role", user);

        if (spot.isOwner || user.profile.role == 'admin') {
            btnRemove.style.display = 'inline';
            console.log('isOwner');
        }
    }
    if (Title) Title.textContent = spot.name;
    if (spotTitle) spotTitle.textContent = spot.name;
    if (spotAddress) spotAddress.textContent = spot.address;
    if (spotRatingText) spotRatingText.textContent = `${spot.star_avg || 0} (${spot.star_count || 0} recensioni)`;
    
    // Gestione Foto
    const photos = spot.spot_photos || [];
    //const fallbackImg = 'https://via.placeholder.com/800x450?text=Nessuna+Foto';

    // Foto Principale
    fotoPrincipaleContainer.innerHTML = `<img src="${photos[0]?.link_foto || ""}" alt="${spot.name}" style="width:100%; height:100%; object-fit:cover;">`;

    // Griglia altre foto (dalla seconda in poi)
    if (grigliaFotoContainer) {
        grigliaFotoContainer.innerHTML = '';
        const secondaryPhotos = photos.slice(1, 5); // Prendi fino a 4 foto extra
        secondaryPhotos.forEach(p => {
            const img = document.createElement('img');
            img.src = p.link_foto;
            img.alt = "Dettaglio spot";
            grigliaFotoContainer.appendChild(img);
        });
    };

    // Aggiorna le stelle in base alla media
    popolaStelle(spot.star_avg || 0);

    // 2. Tag (Pillole)
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        spot.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = tags(tag);
            tagsContainer.appendChild(span);
        });
    }

    // 3. Link Google Maps
    
    if (googleMapFrame && spot.address) {
        googleMapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(spot.address)}&output=embed`;
    }
   
    // 4. Orari di Apertura
    popolaOrari(spot.hours);

    // 5. Recensioni
    popolaRecensioni(spot.recensioni);

    const response_vicini = await fetch(`/api/spots_search_all?latitude=${spot.latitude}&longitude=${spot.longitude}`);

    if (!response_vicini.ok) {
        throw new Error('Errore durante il recupero dei dati dello spot.');
    }

    const spotsVicini = await response_vicini.json();
    console.log("Spot Vicini",spotsVicini);
    renderSpotCards(nearbyGrid, spotsVicini, { showComments: false });
}

function tags(tag) {
    const tagMap = {
        'outdoor': "🌳 All'aperto",
        'indoor': '🏠 Al chiuso',
        'outlets': '🔌 Prese di corrente disponibili',
        'quiet': '🤫 Ambiente Silenzioso',
        'poco affollato': '👤 Poco affollato',
        'abbastanza affollato': '👥 Medio',
        'molto affollato': '🫂 Molto affollato'
    };
    return tagMap[tag.toLowerCase()] || tag;
}

function renderSpotCards(trackElement, spots, options = {}) {
    if (!trackElement) return;

    // Se il componente SpotCard è caricato, usalo
    if (window.SpotCard && typeof window.SpotCard.renderList === 'function') {
        window.SpotCard.renderList(trackElement, spots, {
            showComments: options.showComments === true,
            emptyMessage: options.emptyMessage || 'Nessuno spot nelle vicinanze'
        });
    } else {
        // Fallback manuale se il componente non è ancora pronto
        console.warn("Componente SpotCard non trovato, uso fallback manuale");
        trackElement.innerHTML = spots.map(spot => `
            <div class="spot-card-modern" onclick="window.location.href='/pages/spot.html?id=${spot.id}'">
                <h3>${spot.name}</h3>
                <p>${spot.address || ''}</p>
            </div>
        `).join('');
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

    // Nota: in JavaScript 0 è Domenica, 1 è Lunedì, ecc.
    // Sistemiamo l'array in modo che l'indice combaci con new Date().getDay()
    const giorniSettimana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    const oggiIndice = new Date().getDay();
    const giornoOggiTesto = giorniSettimana[oggiIndice];

    // Ordine di visualizzazione desiderato (es. partendo da Lunedì a Domenica)
    const ordineVisualizzazione = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Cicliamo sull'ordine fisso dei giorni della settimana
    ordineVisualizzazione.forEach(giorno => {
        const li = document.createElement('li');
        
        // Cerchiamo dentro l'array 'hours' se c'è un record per il giorno corrente del ciclo
        const infoGiorno = hours.find(item => item.day_of_week.toLowerCase() === giorno);

        let orarioTesto = 'Chiuso'; // Di base impostiamo a Chiuso se non trova il giorno nel DB

        // Se il giorno esiste nell'array 'hours', estraiamo gli orari
        if (infoGiorno) {
            const apertura = infoGiorno.open_time.substring(0, 5);
            const chiusura = infoGiorno.close_time.substring(0, 5);
            
            orarioTesto = (apertura === chiusura) ? 'Chiuso' : `${apertura} - ${chiusura}`;
        }

        // Check se questo giorno del ciclo corrisponde a oggi
        if (giorno === giornoOggiTesto) {
            li.classList.add('current-day');
        }

        li.innerHTML = `<span class="fw-bold">${capitalizeDayName(giorno)}:</span> <span>${orarioTesto}</span>`;
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
        card.className = 'spot-card-modern';
        
        const tagsHtml = spot.tags && spot.tags.length > 0 
            ? spot.tags.map(tag => `<span class="tag">${tag}</span>`).join('')
            : '';
        
        card.innerHTML = `
            <img src="${spot.image || ''}" alt="${spot.name}" class="spot-card-modern-img" onerror="this.style.display='none'">
            <div class="spot-card-modern-content">
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
            showSystemSuccess(msg);
        } else if (response.status === 401) {
            showSystemError("Effettua il login per gestire i preferiti.");
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
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
        showSystemError("Seleziona una valutazione.");
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
            showSystemSuccess("Recensione pubblicata!");
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else if (response.status === 401) {
            showSystemError("Accedi per recensire.");
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
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
            showSystemSuccess("Spot eliminato con successo.");
            // Reindirizza l'utente alla home o alla mappa dopo l'eliminazione
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else if (response.status === 401 || response.status === 403) {
            showSystemError("Non hai i permessi necessari per eliminare questo spot.");
        } else {
            const err = await response.json();
            throw new Error(err.error || "Errore durante la cancellazione");
        }
    } catch (error) {
        console.error("Errore cancellazione spot:", error);
        showSystemError("Si è verificato un errore: " + error.message);
    }
}

async function generaRiassuntoAI() {
    if (!aiSummaryResult) return;

    if (!currentSpotId) {
        mostraRisultatoAI('ID dello spot non trovato.', 'danger');
        return;
    }

    mostraRisultatoAI('Generazione riassunto in corso...', 'muted');

    if (aiSummaryBtn) {
        aiSummaryBtn.disabled = true;
    }

    try {
        const response = await fetch(`/api/ai/summary-reviews/${currentSpotId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            mostraRisultatoAI(
                result.error || 'Funzioni AI disattivate.',
                'warning'
            );
            return;
        }

        mostraRisultatoAI(
            result.summary || 'Nessun riassunto generato.',
            'success'
        );

    } catch (error) {
        console.error('Errore riassunto AI:', error);
        mostraRisultatoAI(
            'Funzioni AI disattivate. Avvia Ollama per usare il riassunto automatico.',
            'warning'
        );
    } finally {
        if (aiSummaryBtn) {
            aiSummaryBtn.disabled = false;
        }
    }
}

function mostraRisultatoAI(message, type) {
    if (!aiSummaryResult) return;

    aiSummaryResult.textContent = message;

    //rimuove classi di stato precedenti dal risultato
    aiSummaryResult.classList.remove(
        'd-none',
        'alert-success',
        'alert-danger',
        'alert-warning',
        'alert-light'
    );
    //sceglie il colore del risultato in base al tipo (success, danger, warning)  
    if (type === 'success') {
        aiSummaryResult.classList.add('alert-success');
        return;
    }

    if (type === 'danger') {
        aiSummaryResult.classList.add('alert-danger');
        return;
    }

    if (type === 'warning') {
        aiSummaryResult.classList.add('alert-warning');
        return;
    }

    aiSummaryResult.classList.add('alert-light');
}


 
// 1. Intercetta tutti gli errori standard di JavaScript (es. variabili inesistenti, crash improvvisi)
window.addEventListener('error', function (event) {
    // Evita che l'errore standard blocchi tutto o appaia brutto, e usa il tuo popup!
    showSystemError(event.message);
    
});

// 2. Intercetta gli errori delle Promise/Chiamate asincrone non gestite (es. fetch che falliscono senza catch)
window.addEventListener('unhandledrejection', function (event) {
    // event.reason contiene l'oggetto Errore lanciato dentro la Promise
    const messaggio = event.reason.message || "Si è verificato un errore asincrono.";
    showSystemError(messaggio);
});
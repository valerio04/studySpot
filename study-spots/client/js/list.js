"use strict";

const topRatedTrack = document.getElementById('top-rated-track');
const topCommentedTrack = document.getElementById('top-activ-track');

document.addEventListener('DOMContentLoaded', caricaTopRated);
document.addEventListener('DOMContentLoaded', caricaTopCommented);

async function caricaTopRated() {
	if (!topRatedTrack) return;

	try {
		const response = await fetch('/api/spots/top-rated?limit=10', {
			method: 'GET',
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Errore durante il recupero degli spot più votati.');
		}

		const spots = await response.json();
		renderSpotCards(topRatedTrack, spots, '⭐');
	} catch (error) {
		console.error('Errore caricamento top rated:', error);
		renderEmptyState(topRatedTrack, 'Nessun dato disponibile');
	}
}

async function caricaTopCommented() {
	if (!topCommentedTrack) return;

	try {
		const response = await fetch('/api/spots/top-activ?limit=10', {
			method: 'GET',
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Errore durante il recupero degli spot più commentati.');
		}

		const spots = await response.json();
		renderSpotCards(topCommentedTrack, spots, '💬', true);
	} catch (error) {
		console.error('Errore caricamento top activ:', error);
		renderEmptyState(topCommentedTrack, 'Nessun dato disponibile');
	}
}

function renderSpotCards(trackElement, spots, useCommentsCount = false) {
    if (!trackElement) return;
    trackElement.innerHTML = '';

    if (!Array.isArray(spots) || spots.length === 0) {
        renderEmptyState(trackElement, 'Nessun dato disponibile');
        return;
    }

    spots.forEach(spot => {
        // --- CAMBIAMENTO 1: Creiamo un DIV invece di un link diretto ---
        // Questo garantisce che il layout flex non venga rotto dai tag 'a'
        const card = document.createElement('div');
        
        // --- CAMBIAMENTO 2: Uso della nuova classe CSS 'spot-card-modern' ---
        card.className = 'spot-card-modern'; 

        let tagsHtml = '';
        if (useCommentsCount) {
            // --- CAMBIAMENTO 3: Uso delle classi badge di Bootstrap ---
            tagsHtml = `
                <span class="badge badge-custom text-dark-blue border border-dark-blue">💬 ${spot.comment_count ?? 0}</span>
                <span class="badge badge-custom text-dark-blue border border-dark-blue">⭐ ${(Number(spot.star_avg ?? 0).toFixed(1))}</span>
            `;
        } else {
            tagsHtml = `
                <span class="badge badge-custom text-dark-blue border border-dark-blue">⭐ ${(Number(spot.star_avg ?? 0).toFixed(1))}</span>
                <span class="badge badge-custom text-dark-blue border border-dark-blue">🗳️ ${spot.star_count ?? 0}</span>
            `;
        }

        // --- CAMBIAMENTO 4: Struttura HTML interna aggiornata per Bootstrap ---
        card.innerHTML = `
            <div class="card-img-top-placeholder" style="background-color: var(--dark-blue);"></div>
            <div class="p-3">
                <h3 class="h5 fw-bold mb-2 text-dark-blue">${spot.name || 'Spot senza nome'}</h3>
                <div class="d-flex flex-wrap gap-1">
                    ${tagsHtml}
                </div>
            </div>
        `;

        // --- CAMBIAMENTO 5: Event listener per il reindirizzamento ---
        card.onclick = () => window.location.href = '/spot?id=' + encodeURIComponent(spot.id || '');
        
        trackElement.appendChild(card);
    });
}

function renderEmptyState(trackElement, message) {
    if (!trackElement) return;
    // --- CAMBIAMENTO 6: Anche lo stato vuoto usa la nuova classe ---
    trackElement.innerHTML = `
        <div class="spot-card-modern">
            <div class="card-img-top-placeholder bg-light"></div>
            <div class="p-3">
                <h3 class="h5 fw-bold text-muted">${message}</h3>
            </div>
        </div>
    `;
}
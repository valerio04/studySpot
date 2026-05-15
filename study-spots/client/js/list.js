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
        renderSpotCards(topRatedTrack, spots, { showComments: false });
	} catch (error) {
		console.error('Errore caricamento top rated:', error);
        renderSpotCards(topRatedTrack, [], { emptyMessage: 'Nessun dato disponibile' });
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
		console.log(spots);
		renderSpotCards(topCommentedTrack, spots, { showComments: true });
	} catch (error) {
		console.error('Errore caricamento top activ:', error);
		renderSpotCards(topCommentedTrack, [], { emptyMessage: 'Nessun dato disponibile' });
	}
}

function renderSpotCards(trackElement, spots, options = {}) {
    if (!trackElement) return;
    if (window.SpotCard?.renderList) {
        window.SpotCard.renderList(trackElement, spots, {
            showComments: options.showComments === true,
            emptyMessage: options.emptyMessage || 'Nessun dato disponibile'
        });
        return;
    }

    trackElement.innerHTML = '';
}
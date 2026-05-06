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

function renderSpotCards(trackElement, spots, primaryIcon, useCommentsCount = false) {
	if (!trackElement) return;

	trackElement.innerHTML = '';

	if (!Array.isArray(spots) || spots.length === 0) {
		renderEmptyState(trackElement, 'Nessun dato disponibile');
		return;
	}

	spots.forEach(spot => {
		const card = document.createElement('a');
		card.href = '/spot?id=' + encodeURIComponent(spot.id || '');
		let tagsHtml = '';
		if (useCommentsCount) {
			// Più commentati: mostra commenti e stelle
			tagsHtml = `
				<span class="tag">💬 ${spot.comment_count ?? 0}</span>
				<span class="tag">⭐ ${(Number(spot.star_avg ?? 0).toFixed(1))}</span>
			`;
		} else {
			// Top Rated: mostra stelle e numero voti
			tagsHtml = `
				<span class="tag">⭐ ${(Number(spot.star_avg ?? 0).toFixed(1))}</span>
				<span class="tag">🗳️ ${spot.star_count ?? 0}</span>
			`;
		}
		card.innerHTML = `
			<div class="spot-card">
				<div class="card-img-placeholder" style="background-color: #112e51;"></div>
				<div class="card-content">
					<h3>${spot.name || 'Spot senza nome'}</h3>
					<div class="micro-tags">
						${tagsHtml}
					</div>
				</div>
			</div>
		`;
		trackElement.appendChild(card);
	});
}

function renderEmptyState(trackElement, message) {
	if (!trackElement) return;
	trackElement.innerHTML = `
		<div class="spot-card">
			<div class="card-img-placeholder"></div>
			<div class="card-content">
				<h3>${message}</h3>
			</div>
		</div>
	`;
}

"use strict";

// Riferimenti elementi esistenti
const displayUsername = document.getElementById('display-username');
const displayPoints = document.getElementById('display-points');
const inputName = document.getElementById('name');
const inputSurname = document.getElementById('surname');
const inputProfileUsername = document.getElementById('profile-username');
const inputEmail = document.getElementById('email');
const addedSpots = document.getElementById('added-spots');
const savedSpots = document.getElementById('saved-spots');
const commentsCount = document.getElementById('comments');

// Nuovi riferimenti per i track
const savedSpotsTrack = document.getElementById('saved-spots-track');
const addedSpotsTrack = document.getElementById('added-spots-track');
const userCommentsTrack = document.getElementById('user-comments-track');

document.addEventListener('DOMContentLoaded', () => {
    aggiornaProfilo();
    caricaAttivita();
});

// 1. Funzione per i dati testuali del profilo
async function aggiornaProfilo() {
    try {
        const response = await fetch('/api/profile', { credentials: 'include' });
        if (!response.ok) throw new Error('Errore profilo');
        const profile = await response.json();

        if (displayUsername) displayUsername.textContent = profile.username;
        if (displayPoints) displayPoints.textContent = profile.points;
        if (inputName) inputName.value = profile.name ?? '';
        if (inputSurname) inputSurname.value = profile.surname ?? '';
        if (inputProfileUsername) inputProfileUsername.value = profile.username ?? '';
        if (inputEmail) inputEmail.value = profile.email ?? '';
        if (addedSpots) addedSpots.textContent = profile.aggiunti_count ?? 0;
        if (savedSpots) savedSpots.textContent = profile.salvati_count ?? 0;
        if (commentsCount) commentsCount.textContent = profile.commenti_count ?? 0;
        
        
        // Iniziali avatar
        const avatar = document.getElementById('avatar-initials');
        if (avatar) avatar.textContent = (profile.name?.[0]  + profile.surname?.[0] ).toUpperCase();

    } catch (error) {
        console.error('Errore aggiornamento profilo:', error);
    }
}

// 2. Funzione principale per caricare le tre righe
async function caricaAttivita() {
    // Caricamento parallelo delle tre API
    caricaTrack('/api/salvati', savedSpotsTrack, '❤️');
    caricaTrack('/api/aggiunti', addedSpotsTrack, '📍');
    caricaCommenti('/api/commenti-aggiunti', userCommentsTrack);
}

// 3. Renderizzatore per Spot (Salvati e Aggiunti)
async function caricaTrack(endpoint, trackElement, icon) {
    if (!trackElement) return;
    try {
        const response = await fetch(endpoint, { credentials: 'include' });
        const rawData = await response.json();
        const spots = rawData.map(item => item.spots).filter(s => s !== null);
        renderCards(trackElement, spots);
    } catch (error) {
        trackElement.innerHTML = `<div class="alert alert-danger w-100">Errore nel caricamento</div>`;
    }
}

// 4. Renderizzatore specifico per i Commenti
async function caricaCommenti(endpoint, trackElement) {
    if (!trackElement) return;
    try {
        const response = await fetch(endpoint, { credentials: 'include' });
        const commenti = await response.json();

        trackElement.innerHTML = '';
        if (!commenti || commenti.length === 0) {
            trackElement.innerHTML = '<div class="text-muted p-3">Nessun commento fatto</div>';
            return;
        }

        commenti.forEach(c => {
            const card = document.createElement('a');
            card.href = `/spot?id=${c.spot_id}`;
            card.className = "card shadow-sm flex-shrink-0 text-decoration-none text-dark border-0"; 
            card.style.width = "250px";
            card.style.backgroundColor = "#b3b6b9ff"
            
            card.innerHTML = `
                <div class="card-body p-3">
                    <div class="mb-2"><span class="badge bg-warning text-dark">⭐ ${c.star}</span></div>
                    <p class="card-text small mb-2" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; height: 3.6em;">
                        "${c.comment || 'Nessun testo'}"
                    </p>
                    <div style="color: #112E51; font-size: 0.8rem; font-weight: bold;">Vedi spot →</div>
                </div>
            `;
            trackElement.appendChild(card);
        });
    } catch (error) {
        trackElement.innerHTML = `<div class="alert alert-danger w-100">Errore caricamento commenti</div>`;
    }
}

// Helper per generare le card degli spot
function renderCards(container, data) {
    if (window.SpotCard?.renderList) {
        window.SpotCard.renderList(container, data, {
            showComments: false,
            emptyMessage: 'Nessun spot trovato'
        });
        return;
    }

    container.innerHTML = '';
}


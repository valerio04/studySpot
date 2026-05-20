"use strict";

// Riferimenti elementi profilo
const displayUsername = document.getElementById('display-username');
const displayPoints = document.getElementById('display-points');

const inputName = document.getElementById('name');
const inputSurname = document.getElementById('surname');
const inputProfileUsername = document.getElementById('profile-username');
const inputEmail = document.getElementById('email');
const inputPassword = document.getElementById('password');

const addedSpots = document.getElementById('added-spots');
const savedSpots = document.getElementById('saved-spots');
const commentsCount = document.getElementById('comments');

const editBtn = document.getElementById('edit-btn');
const editActions = document.getElementById('edit-actions');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const profileForm = document.getElementById('profile-form');

// Riferimenti track
const savedSpotsTrack = document.getElementById('saved-spots-track');
const addedSpotsTrack = document.getElementById('added-spots-track');
const userCommentsTrack = document.getElementById('user-comments-track');

// Serve per ripristinare i dati se clicchi Annulla
let originalProfile = null;

document.addEventListener('DOMContentLoaded', inizializzaProfilo);

function inizializzaProfilo() {
    aggiornaProfilo();
    caricaAttivita();

    if (editBtn) {
        editBtn.addEventListener('click', attivaModificaProfilo);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', annullaModificaProfilo);
    }

    if (profileForm) {
        profileForm.addEventListener('submit', salvaModificaProfilo);
    }
}

// ================= PROFILO =================

async function aggiornaProfilo() {
    try {
        const response = await fetch('/api/profile', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Errore profilo');
        }

        const profile = await response.json();

        originalProfile = profile;

        if (displayUsername) displayUsername.textContent = profile.username;
        if (displayPoints) displayPoints.textContent = profile.points;

        if (inputName) inputName.value = profile.name || '';
        if (inputSurname) inputSurname.value = profile.surname || '';
        if (inputProfileUsername) inputProfileUsername.value = profile.username || '';
        if (inputEmail) inputEmail.value = profile.email || '';

        if (addedSpots) addedSpots.textContent = profile.aggiunti_count || 0;
        if (savedSpots) savedSpots.textContent = profile.salvati_count || 0;
        if (commentsCount) commentsCount.textContent = profile.commenti_count || 0;

        aggiornaAvatar(profile);

    } catch (error) {
        console.error('Errore aggiornamento profilo:', error);
    }
}

function aggiornaAvatar(profile) {
    const avatar = document.getElementById('avatar-initials');

    if (!avatar) {
        return;
    }

    const primaLetteraNome = profile.name ? profile.name[0] : '';
    const primaLetteraCognome = profile.surname ? profile.surname[0] : '';

    avatar.textContent = (primaLetteraNome + primaLetteraCognome).toUpperCase();
}

function attivaModificaProfilo() {
    cambiaStatoInput(false);

    if (editBtn) {
        editBtn.hidden = true;
    }

    if (editActions) {
        editActions.hidden = false;
        editActions.classList.add('d-flex');
    }
}

function annullaModificaProfilo() {
    if (originalProfile) {
        if (inputName) inputName.value = originalProfile.name || '';
        if (inputSurname) inputSurname.value = originalProfile.surname || '';
        if (inputProfileUsername) inputProfileUsername.value = originalProfile.username || '';
        if (inputEmail) inputEmail.value = originalProfile.email || '';
    }

    cambiaStatoInput(true);
    chiudiModificaProfilo();
}

function chiudiModificaProfilo() {
    if (editBtn) {
        editBtn.hidden = false;
    }

    if (editActions) {
        editActions.classList.remove('d-flex');
        editActions.hidden = true;
    }
}



async function salvaModificaProfilo(event) {
    event.preventDefault();

    const datiProfilo = {
        name: inputName.value.trim(),
        surname: inputSurname.value.trim(),
        username: inputProfileUsername.value.trim(),
        email: inputEmail.value.trim()
    };

    if (!datiProfilo.name || !datiProfilo.surname || !datiProfilo.username || !datiProfilo.email) {
        showSystemError('Compila tutti i campi prima di salvare.');
        return;
    }

    try {
        const response = await fetch('/api/modify-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(datiProfilo)
        });

        const result = await response.json();

        if (!response.ok) {
            showSystemError(result.error || 'Errore durante la modifica del profilo.');
            return;
        }

        showSystemSuccess(result.message || 'Profilo aggiornato con successo.');

        cambiaStatoInput(true);

        chiudiModificaProfilo();

        await aggiornaProfilo();

    } catch (error) {
        console.error('Errore salvataggio profilo:', error);
        showSystemError('Errore di rete durante la modifica del profilo.');
    }
}

function cambiaStatoInput(disabled) {
    if (inputName) inputName.disabled = disabled;
    if (inputSurname) inputSurname.disabled = disabled;
    if (inputProfileUsername) inputProfileUsername.disabled = disabled;
    if (inputEmail) inputEmail.disabled = disabled;

    // La password resta sempre bloccata
    if (inputPassword) inputPassword.disabled = true;
}

// ================= ATTIVITÀ =================

async function caricaAttivita() {
    caricaTrack('/api/salvati', savedSpotsTrack);
    caricaTrack('/api/aggiunti', addedSpotsTrack);
    caricaCommenti('/api/commenti-aggiunti', userCommentsTrack);
}

async function caricaTrack(endpoint, trackElement) {
    if (!trackElement) return;

    try {
        const response = await fetch(endpoint, {
            credentials: 'include'
        });

        const rawData = await response.json();
        console.log('spot trovati', rawData)
        const spots = rawData.map(function (item) {
            return item.spots;
        }).filter(function (spot) {
            return spot !== null;
        });

        renderCards(trackElement, spots);

    } catch (error) {
        trackElement.innerHTML = '<div class="alert alert-danger w-100">Errore nel caricamento</div>';
    }
}

async function caricaCommenti(endpoint, trackElement) {
    if (!trackElement) return;

    try {
        const response = await fetch(endpoint, {
            credentials: 'include'
        });

        const commenti = await response.json();

        trackElement.innerHTML = '';

        if (!commenti || commenti.length === 0) {
            trackElement.innerHTML = '<div class="text-muted p-3">Nessun commento fatto</div>';
            return;
        }

        commenti.forEach(function (commento) {
            const card = document.createElement('a');

            card.href = '/spot?id=' + commento.spot_id;
            card.className = 'card shadow-sm flex-shrink-0 text-decoration-none text-dark border-0';
            card.style.width = '250px';
            card.style.backgroundColor = '#fdfdfd';

            card.innerHTML = `
                <div class="card-body p-3">
                    <div class="mb-2">
                        <span class="badge bg-warning text-dark">⭐ ${commento.star}</span>
                    </div>

                    <p class="card-text small mb-2" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; height: 3.6em;">
                        "${commento.comment || 'Nessun testo'}"
                    </p>

                    <div style="color: #112E51; font-size: 0.8rem; font-weight: bold;">
                        Vedi spot →
                    </div>
                </div>
            `;

            trackElement.appendChild(card);
        });

    } catch (error) {
        trackElement.innerHTML = '<div class="alert alert-danger w-100">Errore caricamento commenti</div>';
    }
}

function renderCards(container, data) {
    if (window.SpotCard && window.SpotCard.renderList) {
        window.SpotCard.renderList(container, data, {
            showComments: false,
            emptyMessage: 'Nessun spot trovato'
        });
        return;
    }

    container.innerHTML = '';
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
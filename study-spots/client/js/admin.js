"use strict";

// Riferimenti agli elementi del DOM
const generalReportsTrack = document.getElementById('general-reports-track');
const userReportsTrack = document.getElementById('user-reports-track'); // Nuovo riferimento
const spotReportsTrack = document.getElementById('spot-reports-track');
const userSpotsResults = document.getElementById('user-spots-results');
const singleSpotResult = document.getElementById('single-spot-result');
const alertContainer = document.getElementById('admin-alert-container');

// Carica i dati quando la pagina è pronta
document.addEventListener('DOMContentLoaded', loadReports);

//TODO: mettere questo errrore in tute le pag sostutendolo al avecchio

// Mostra un messaggio di alert (successo o errore)
function showAlert(message, type = 'success') {
    if (!alertContainer) {
        console.warn('Admin alert container not found:', message);
        return;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alertContainer.append(wrapper);
    // Rimuovi l'alert dopo 5 secondi
    setTimeout(() => wrapper.remove(), 5000);
}

//Carica le segnalazioni pendenti dal backend
 
async function loadReports() {
    try {
        const response = await fetch('/api/admin/reports');
        console.info('Admin reports response:', response.status, response.statusText);
        if (response.status === 401 || response.status === 403) {
            showAlert(`Accesso negato (${response.status}). Assicurati di essere loggato come admin dalla stessa sessione.`, 'danger');
            document.querySelector('main').innerHTML = '<h1 class="text-danger text-center">Accesso Negato</h1><p class="text-center">Non hai i permessi per visualizzare questa pagina.</p>';
            return;
        }
        if (!response.ok) {
            let errorMessage = 'Errore di rete o del server.';
            try {
                const errorPayload = await response.json();
                errorMessage = errorPayload?.error || errorMessage;
            } catch (parseError) {
                // ignoriamo errori di parsing e usiamo il messaggio di default
            }
            throw new Error(errorMessage);
        }
        
        const reports = await response.json();
        console.info('Admin reports payload:', reports);
        if (!Array.isArray(reports)) {
            showAlert('Risposta API non valida: atteso array di report.', 'danger');
            return;
        }
        if (reports.length === 0) {
            showAlert('Nessuna segnalazione trovata. Controlla lo status nel DB (pendente/inviato).', 'warning');
        }
        
        // Pulisci tutte le sezioni
        generalReportsTrack.innerHTML = '';
        userReportsTrack.innerHTML = '';
        spotReportsTrack.innerHTML = '';

        // **LOGICA DI SMISTAMENTO CORRETTA E ROBUSTA**
        const isEmptyRelation = (val) => !val || (Array.isArray(val) && val.length === 0);
        const hasRelation = (val) => !isEmptyRelation(val);

        const generalReports = reports.filter(r => isEmptyRelation(r.spot) && isEmptyRelation(r.target_user));
        const userReports = reports.filter(r => hasRelation(r.target_user) && isEmptyRelation(r.spot));
        const spotReports = reports.filter(r => hasRelation(r.spot));

        // Renderizza report generali
        if (generalReports.length === 0) {
            generalReportsTrack.innerHTML = '<div class="text-muted">Nessuna segnalazione generale.</div>';
        } else {
            generalReports.forEach(report => renderReportCard(report, generalReportsTrack));
        }

        // Renderizza report utenti
        if (userReports.length === 0) {
            userReportsTrack.innerHTML = '<div class="text-muted">Nessuna segnalazione sugli utenti.</div>';
        } else {
            userReports.forEach(report => renderReportCard(report, userReportsTrack));
        }

        // Renderizza report spot
        if (spotReports.length === 0) {
            spotReportsTrack.innerHTML = '<div class="text-muted">Nessuna segnalazione dagli spot.</div>';
        } else {
            spotReports.forEach(report => renderReportCard(report, spotReportsTrack));
        }

    } catch (error) {
        showAlert(`Impossibile caricare le segnalazioni: ${error.message}`, 'danger');
        if (generalReportsTrack) {
            generalReportsTrack.innerHTML = `<div class="text-danger">${error.message}</div>`;
        }
        if (userReportsTrack) {
            userReportsTrack.innerHTML = `<div class="text-danger">${error.message}</div>`;
        }
        if (spotReportsTrack) {
            spotReportsTrack.innerHTML = `<div class="text-danger">${error.message}</div>`;
        }
    }
}

/**
 * Crea e appende una card per una singola segnalazione
 * @param {object} report - L'oggetto della segnalazione
 * @param {HTMLElement} container - Il contenitore dove appendere la card
 */
function renderReportCard(report, container) {
    const card = document.createElement('div');
    card.className = 'card shadow-sm flex-shrink-0 border-start border-4 border-warning';
    card.style.width = '300px';
    card.id = `report-${report.id}`;

    const reportDate = new Date(report.created_at).toLocaleDateString('it-IT');
    
    const reporterUsername = report.reporter?.username || report.reporter?.[0]?.username || 'Sconosciuto';
    
    let targetInfo = '';
    const spotObj = report.spot?.id ? report.spot : report.spot?.[0];
    if (spotObj) {
        targetInfo = `
            <p class="card-text small mb-1">
                <strong>Spot:</strong> <a href="/spot?id=${spotObj.id}">${spotObj.name} (#${spotObj.id})</a>
            </p>`;
    }
    const targetUserObj = report.target_user?.username ? report.target_user : report.target_user?.[0];
    if (targetUserObj) {
        targetInfo += `
            <p class="card-text small mb-1">
                <strong>Utente Segnalato:</strong> ${targetUserObj.username}
            </p>`;
    }

    card.innerHTML = `
        <div class="card-body">
            <h6 class="card-title small text-muted">Da: ${reporterUsername} - ${reportDate}</h6>
            <p class="card-text fst-italic">"${report.message}"</p>
            ${targetInfo}
            <div class="mt-3 d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-outline-success" onclick="updateReportStatus(${report.id}, 'risolto')">Risolto</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="updateReportStatus(${report.id}, 'rifiutato')">Rifiuta</button>
            </div>
        </div>
    `;
    container.appendChild(card);
}

/**
 * Aggiorna lo stato di una segnalazione (risolto/rifiutato)
 * @param {number} reportId - L'ID della segnalazione
 * @param {string} status - Il nuovo stato
 */
async function updateReportStatus(reportId, status) {
    try {
        const response = await fetch(`/api/admin/reports/${reportId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Errore durante l\'aggiornamento.');

        showAlert('Segnalazione aggiornata con successo!');
        
        // Rimuovi la card dall'interfaccia con un'animazione
        const cardToRemove = document.getElementById(`report-${reportId}`);
        if (cardToRemove) {
            cardToRemove.style.transition = 'opacity 0.5s ease';
            cardToRemove.style.opacity = '0';
            setTimeout(() => cardToRemove.remove(), 500);
        }

    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

/**
 * Cerca gli spot creati da un utente
 */
async function cercaSpotUtente() {
    const query = document.getElementById('user-search-query').value;
    if (!query) {
        showAlert('Inserisci un username o email da cercare.', 'danger');
        return;
    }

    try {
        const response = await fetch(`/api/admin/search-user-spots?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
             const err = await response.json();
             throw new Error(err.error || 'Utente non trovato');
        }
        const data = await response.json();
        
        userSpotsResults.innerHTML = ''; // Pulisci risultati precedenti
        if (data.spots.length === 0) {
            userSpotsResults.innerHTML = `<div class="text-muted">L'utente ${data.user.username} non ha creato spot.</div>`;
            return;
        }

        data.spots.forEach(spot => {
            const card = document.createElement('a');
            card.href = `/spot?id=${spot.id}`;
            card.className = "card shadow-sm flex-shrink-0 text-decoration-none text-dark";
            card.style.width = "220px";
            card.innerHTML = `
                <div class="card-body">
                    <h6 class="card-title text-truncate">${spot.name}</h6>
                    <p class="card-text small text-truncate">${spot.address}</p>
                    <span class="badge bg-primary">${spot.type}</span>
                    <span class="badge bg-warning text-dark">⭐ ${Number(spot.star_avg || 0).toFixed(1)}</span>
                </div>
            `;
            userSpotsResults.appendChild(card);
        });

    } catch (error) {
        showAlert(error.message, 'danger');
        userSpotsResults.innerHTML = `<div class="text-danger">${error.message}</div>`;
    }
}

/**
 * Cerca un singolo spot tramite il suo ID
 */
async function cercaSpotPerID() {
    const spotId = document.getElementById('spot-id-query').value;
    if (!spotId || isNaN(spotId)) {
        showAlert('Inserisci un ID numerico valido.', 'danger');
        return;
    }

    // Pulisci i risultati precedenti
    singleSpotResult.innerHTML = '';

    try {
        const response = await fetch(`/api/info-spot/${spotId}`);
        
        // Se la risposta non è OK (es. 404 Not Found), gestiamo l'errore
        if (!response.ok) {
            singleSpotResult.innerHTML = '<div class="text-muted">Spot non trovato.</div>';
            return;
        }
        
        const spot = await response.json();

        // Se tutto va bene, creiamo la card
        singleSpotResult.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header">Risultato per ID: <strong>${spot.id}</strong></div>
                <div class="card-body">
                    <h5 class="card-title">${spot.name}</h5>
                    <p class="card-text text-muted">${spot.address}</p>
                    <a href="/spot?id=${spot.id}" class="btn btn-sm btn-outline-primary">Vai alla pagina dello spot</a>
                </div>
            </div>
        `;
    } catch (error) {
        // Gestisce errori di rete o altri problemi imprevisti
        showAlert('Si è verificato un errore di rete.', 'danger');
        singleSpotResult.innerHTML = '<div class="text-danger">Impossibile completare la ricerca.</div>';
    }
}

/**
 * Esegue direttamente la cancellazione massiva degli spot di un utente.
 * CHIAMATA DIRETTAMENTE DAL PULSANTE, SENZA MODALE.
 */
async function rimuoviTuttiSpot() {
    const username = document.getElementById('target-username-delete').value;
    if (!username) {
        showAlert('Inserisci un username nel campo di testo.', 'danger');
        return;
    }

    // Chiediamo una conferma testuale per sicurezza, dato che non c'è più il modale
    if (!confirm(`Sei assolutamente sicuro di voler eliminare tutti gli spot creati da "${username}"? L'azione è irreversibile.`)) {
        return; // L'utente ha annullato
    }

    try {
        const response = await fetch('/api/admin/delete-all-user-spots', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Errore durante la cancellazione.');
        }

        showAlert(result.message || 'Operazione completata con successo!');
        document.getElementById('target-username-delete').value = ''; // Pulisci l'input

    } catch (error) {
        showAlert(error.message, 'danger');
    }
}
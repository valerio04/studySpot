/*gestisce le segnalazioni inviate dagli utenti, 
sia dalla home sia dalla pagina dettaglio spot.*/

"use strict";

// Elementi del DOM per il form di segnalazione nella homee per il form di segnalazione nella pagina dettaglio spot
const indexReportForm = document.getElementById('index-report-form');
const indexReportType = document.getElementById('index-report-type');
const indexUsernameBox = document.getElementById('index-reported-username-box');
const indexUsernameInput = document.getElementById('index-reported-username');
const indexMessageInput = document.getElementById('index-report-message');
const indexFeedback = document.getElementById('index-report-feedback');

const spotReportForm = document.getElementById('spot-report-form');
const spotReportType = document.getElementById('spot-report-type');
const spotUsernameBox = document.getElementById('spot-reported-username-box');
const spotUsernameInput = document.getElementById('spot-reported-username');
const spotMessageInput = document.getElementById('spot-report-message');
const spotFeedback = document.getElementById('spot-report-feedback');

// Inizializza i form di segnalazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', setupReportForms);

// Funzione per configurare i form di segnalazione, aggiungendo event listener per i cambiamenti del tipo di segnalazione e per l'invio del form
function setupReportForms() {
    if (indexReportForm) {
        indexReportType.addEventListener('change', aggiornaIndexUsername);
        indexReportForm.addEventListener('submit', inviaIndexReport);
    }

    if (spotReportForm) {
        spotReportType.addEventListener('change', aggiornaSpotUsername);
        spotReportForm.addEventListener('submit', inviaSpotReport);
    }
}

// Funzioni per mostrare o nascondere il campo username in base al tipo di segnalazione selezionato
function aggiornaIndexUsername() {
    aggiornaCampoUsername(indexReportType, indexUsernameBox, indexUsernameInput);
}
//funzione per mostrare o nascondere il campo  in base al tipo di segnalazione selezionato nella pagina dettaglio spot
function aggiornaSpotUsername() {
    aggiornaCampoUsername(spotReportType, spotUsernameBox, spotUsernameInput);
}

// Funzioni per gestire l'invio dei form di segnalazione, validando i dati e inviando la richiesta al server
async function inviaIndexReport(event) {
    event.preventDefault();

    const reportType = indexReportType.value;
    const message = indexMessageInput.value.trim();
    const username = indexUsernameInput.value.trim();

    if (!message) {
        showReportFeedback(indexFeedback, 'Scrivi una descrizione della segnalazione.', 'danger');
        return;
    }

    if (reportType === 'utente' && !username) {
        showReportFeedback(indexFeedback, 'Inserisci lo username dell’utente da segnalare.', 'danger');
        return;
    }

    const payload = {
        report_type: reportType,
        message: message
    };

    if (reportType === 'utente') {
        payload.reported_username = username;
    }

    await sendReport(payload, indexFeedback, indexReportForm);
}

// Funzione per gestire l'invio del form di segnalazione nella pagina dettaglio spot, validando i dati e inviando la richiesta al server
async function inviaSpotReport(event) {
    event.preventDefault();

    const reportType = spotReportType.value;
    const message = spotMessageInput.value.trim();
    const username = spotUsernameInput.value.trim();
    const spotId = getCurrentSpotId();

    if (!message) {
        showReportFeedback(spotFeedback, 'Scrivi una descrizione della segnalazione.', 'danger');
        return;
    }

    if (reportType === 'utente' && !username) {
        showReportFeedback(spotFeedback, 'Inserisci lo username dell’utente da segnalare.', 'danger');
        return;
    }

    if (reportType === 'spot' && !spotId) {
        showReportFeedback(spotFeedback, 'ID dello spot non trovato.', 'danger');
        return;
    }

    const payload = {
        report_type: reportType,
        message: message
    };

    if (reportType === 'spot') {
        payload.spot_id = spotId;
    }

    if (reportType === 'utente') {
        payload.reported_username = username;
    }

    await sendReport(payload, spotFeedback, spotReportForm);
}

// Funzione per mostrare o nascondere il campo username in base al tipo di segnalazione selezionato, usata sia nella home che nella pagina dettaglio spot
function aggiornaCampoUsername(reportTypeSelect, usernameBox, usernameInput) {
    if (!reportTypeSelect || !usernameBox || !usernameInput) return;

    if (reportTypeSelect.value === 'utente') {
        usernameBox.classList.remove('d-none');
        usernameInput.required = true;
        return;
    }

    usernameBox.classList.add('d-none');
    usernameInput.required = false;
    usernameInput.value = '';
}

// Funzione per inviare la segnalazione al server, gestendo la risposta e mostrando feedback all'utente
async function sendReport(payload, feedbackElement, form) {
    showReportFeedback(feedbackElement, 'Invio segnalazione in corso...', 'muted');

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.status === 401) {
            showReportFeedback(feedbackElement, 'Devi effettuare il login per inviare una segnalazione.', 'danger');
            return;
        }

        if (!response.ok) {
            showReportFeedback(feedbackElement, result.error || 'Errore durante l’invio della segnalazione.', 'danger');
            return;
        }

        showReportFeedback(feedbackElement, result.message || 'Segnalazione inviata con successo.', 'success');
        showSystemSuccess(result.message || 'Segnalazione inviata con successo.');
        form.reset();
        resetReportFormsVisibility();

    } catch (error) {
        console.error('Errore segnalazione:', error);
        showReportFeedback(feedbackElement, 'Errore di rete durante l’invio della segnalazione.', 'danger');
    }
}

function getCurrentSpotId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Funzione per mostrare feedback all'utente dopo l'invio della segnalazione, con messaggi e stili diversi in base al tipo di feedback (successo, errore, avviso)
function showReportFeedback(element, message, type) {
    if (!element) return;

    element.textContent = message;

    element.classList.remove(
        'text-success',
        'text-danger',
        'text-muted',
        'text-warning'
    );

    if (type === 'success') {
        element.classList.add('text-success');
        return;
    }

    if (type === 'danger') {
        element.classList.add('text-danger');
        return;
    }

    if (type === 'warning') {
        element.classList.add('text-warning');
        return;
    }

    element.classList.add('text-muted');
}


// Funzione per resettare la visibilità dei campi username nei form di segnalazione, usata dopo l'invio di una segnalazione per riportare i form allo stato iniziale
function resetReportFormsVisibility() {
    if (indexUsernameBox && indexUsernameInput) {
        indexUsernameBox.classList.add('d-none');
        indexUsernameInput.required = false;
    }

    if (spotUsernameBox && spotUsernameInput) {
        spotUsernameBox.classList.add('d-none');
        spotUsernameInput.required = false;
    }
}


//  Intercetta tutti gli errori standard di JavaScript (es. variabili inesistenti, crash improvvisi)
window.addEventListener('error', function (event) {
    // Evita che l'errore standard blocchi tutto o appaia brutto, e usa il popup personalizzato
    showSystemError(event.message);
    
});

// Intercetta gli errori delle Promise/Chiamate asincrone non gestite (es. fetch che falliscono senza catch)
window.addEventListener('unhandledrejection', function (event) {
    // event.reason contiene l'oggetto Errore lanciato dentro la Promise
    const messaggio = event.reason.message || "Si è verificato un errore asincrono.";
    showSystemError(messaggio);
});

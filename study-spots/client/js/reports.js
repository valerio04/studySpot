"use strict";

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

document.addEventListener('DOMContentLoaded', setupReportForms);

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

function aggiornaIndexUsername() {
    aggiornaCampoUsername(indexReportType, indexUsernameBox, indexUsernameInput);
}

function aggiornaSpotUsername() {
    aggiornaCampoUsername(spotReportType, spotUsernameBox, spotUsernameInput);
}

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

